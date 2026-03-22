"""
AI Smart Reframing Service.

Implements Opus-style dynamic subject tracking for 9:16 vertical video.

Pipeline:
1. Analyze source video to detect faces/people per frame
2. Build a smooth crop trajectory that follows the primary subject
3. Render the final 9:16 video using FFmpeg with per-frame crop coordinates

Uses MediaPipe Face Detection for fast, accurate face tracking.
Falls back to center crop if no faces are detected.
"""

import subprocess
import os
import json
import math
import shutil
import tempfile
from pathlib import Path
from typing import Optional, List, Tuple, Callable, Dict, Any
from dataclasses import dataclass, field

import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import mediapipe as mp
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False

from config import settings


@dataclass
class BoundingBox:
    """A detected face/subject bounding box."""
    x: float       # center x (0.0 to 1.0, normalized)
    y: float       # center y
    width: float   # box width (normalized)
    height: float  # box height (normalized)
    confidence: float


@dataclass
class FrameDetection:
    """Detection results for a single frame."""
    frame_index: int
    timestamp: float
    faces: List[BoundingBox]
    primary_x: float  # Primary subject center x (normalized)
    primary_y: float  # Primary subject center y (normalized)
    has_detection: bool


@dataclass
class CropKeyframe:
    """A crop position at a specific timestamp."""
    timestamp: float
    crop_x: int  # Left edge of crop window in pixels
    crop_y: int  # Top edge of crop window in pixels


class ReframeService:
    """
    AI-powered smart reframing for 9:16 vertical video.

    Analyzes the video to find faces, builds a smooth crop trajectory
    that follows the speaker, and renders the final vertical clip.
    """

    # Output dimensions
    OUT_W = 720
    OUT_H = 1280
    ASPECT = OUT_W / OUT_H  # 0.5625

    # Analysis settings
    ANALYSIS_FPS = 4          # Analyze 4 frames per second (fast + accurate enough)
    MIN_FACE_CONFIDENCE = 0.5
    SMOOTHING_WINDOW = 12     # Frames for moving average smoothing
    MAX_SPEED = 0.03          # Max crop movement per frame (normalized, prevents jumps)
    EDGE_PADDING = 0.05       # Padding from frame edges (5%)

    def __init__(self):
        self._detector = None
        self._available = HAS_CV2 and HAS_MEDIAPIPE

        if not self._available:
            missing = []
            if not HAS_CV2:
                missing.append("opencv-python-headless")
            if not HAS_MEDIAPIPE:
                missing.append("mediapipe")
            if missing:
                print(f"  ⚠ Smart reframing unavailable (missing: {', '.join(missing)})")
                print(f"    Install: pip install {' '.join(missing)}")

    @property
    def is_available(self) -> bool:
        return self._available

    def _get_detector(self):
        """Lazily initialize MediaPipe face detector."""
        if self._detector is None and self._available:
            mp_face = mp.solutions.face_detection
            self._detector = mp_face.FaceDetection(
                model_selection=1,       # 1 = full range model (works at distance)
                min_detection_confidence=self.MIN_FACE_CONFIDENCE,
            )
        return self._detector

    # ─── Main Entry Point ──────────────────────────────────────

    def reframe_clip(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        output_path: str,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> str:
        """
        Creates a smart-reframed 9:16 clip from the source video.

        Steps:
        1. Extract analysis frames at low FPS
        2. Detect faces in each frame
        3. Build smooth crop trajectory
        4. Render final video with dynamic crop
        """
        if not self._available:
            raise RuntimeError("Smart reframing not available. Install opencv-python-headless and mediapipe.")

        duration = end_time - start_time
        if duration <= 0:
            raise ValueError("Invalid time range")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Get source video dimensions
        src_info = self._probe_dimensions(source_path)
        src_w = src_info["width"]
        src_h = src_info["height"]

        if src_w == 0 or src_h == 0:
            raise RuntimeError("Cannot determine source video dimensions.")

        if on_progress:
            on_progress(0, "Analyzing video for subject tracking...")

        # Step 1: Analyze frames for face detection
        detections = self._analyze_frames(
            source_path, start_time, end_time, src_w, src_h, on_progress
        )

        if on_progress:
            on_progress(40, "Building smooth crop trajectory...")

        # Step 2: Build smooth crop trajectory
        crop_data = self._build_crop_trajectory(
            detections, src_w, src_h, duration
        )

        if on_progress:
            on_progress(50, "Rendering smart-reframed clip...")

        # Step 3: Render with dynamic crop using FFmpeg
        self._render_with_crop_trajectory(
            source_path, start_time, end_time,
            src_w, src_h, crop_data, output_path, on_progress
        )

        return output_path

    # ─── Frame Analysis ────────────────────────────────────────

    def _analyze_frames(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        src_w: int,
        src_h: int,
        on_progress: Optional[Callable] = None,
    ) -> List[FrameDetection]:
        """
        Extracts frames at ANALYSIS_FPS and runs face detection on each.
        Returns list of FrameDetection with face positions.
        """
        detector = self._get_detector()
        duration = end_time - start_time
        total_frames = max(1, int(duration * self.ANALYSIS_FPS))
        detections: List[FrameDetection] = []

        cap = cv2.VideoCapture(source_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {source_path}")

        try:
            for i in range(total_frames):
                timestamp = start_time + (i / self.ANALYSIS_FPS)
                cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
                ret, frame = cap.read()

                if not ret or frame is None:
                    # Append center default if frame read fails
                    detections.append(FrameDetection(
                        frame_index=i, timestamp=timestamp,
                        faces=[], primary_x=0.5, primary_y=0.5,
                        has_detection=False,
                    ))
                    continue

                # Convert BGR to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = detector.process(rgb_frame)

                faces: List[BoundingBox] = []
                if results.detections:
                    for detection in results.detections:
                        bbox = detection.location_data.relative_bounding_box
                        confidence = detection.score[0] if detection.score else 0

                        cx = bbox.xmin + bbox.width / 2
                        cy = bbox.ymin + bbox.height / 2

                        # Clamp to valid range
                        cx = max(0.0, min(1.0, cx))
                        cy = max(0.0, min(1.0, cy))

                        faces.append(BoundingBox(
                            x=cx, y=cy,
                            width=bbox.width, height=bbox.height,
                            confidence=confidence,
                        ))

                # Determine primary subject
                primary_x, primary_y = self._select_primary_subject(faces)

                detections.append(FrameDetection(
                    frame_index=i,
                    timestamp=timestamp,
                    faces=faces,
                    primary_x=primary_x,
                    primary_y=primary_y,
                    has_detection=len(faces) > 0,
                ))

                # Progress: analysis is 0-40%
                if on_progress and i % 5 == 0:
                    pct = (i / total_frames) * 40
                    face_count = sum(1 for d in detections if d.has_detection)
                    on_progress(pct, f"Analyzing frame {i+1}/{total_frames} ({face_count} faces found)")

        finally:
            cap.release()

        return detections

    def _select_primary_subject(self, faces: List[BoundingBox]) -> Tuple[float, float]:
        """
        Selects the primary subject from detected faces.

        Strategy:
        1. If one face: use it
        2. If multiple: pick the largest face (likely the main speaker)
        3. If no faces: return center (0.5, 0.5)
        """
        if not faces:
            return 0.5, 0.5

        if len(faces) == 1:
            return faces[0].x, faces[0].y

        # Pick the largest face by area
        largest = max(faces, key=lambda f: f.width * f.height)
        return largest.x, largest.y

    # ─── Crop Trajectory ───────────────────────────────────────

    def _build_crop_trajectory(
        self,
        detections: List[FrameDetection],
        src_w: int,
        src_h: int,
        duration: float,
    ) -> List[CropKeyframe]:
        """
        Builds a smooth crop trajectory from frame detections.

        1. Extracts raw x positions from detections
        2. Fills gaps where no face was detected using interpolation
        3. Applies exponential moving average for smoothness
        4. Clamps speed to prevent jarring jumps
        5. Converts normalized positions to pixel crop coordinates
        """
        if not detections:
            # No detections at all — center crop
            crop_w = int(src_h * self.ASPECT)
            crop_x = max(0, (src_w - crop_w) // 2)
            return [CropKeyframe(timestamp=0, crop_x=crop_x, crop_y=0)]

        # ─── Extract raw positions ─────────────────────────────
        raw_x = [d.primary_x for d in detections]
        has_face = [d.has_detection for d in detections]
        timestamps = [d.timestamp - detections[0].timestamp for d in detections]

        # ─── Fill gaps by interpolation ────────────────────────
        filled_x = self._interpolate_gaps(raw_x, has_face)

        # ─── Apply smoothing ──────────────────────────────────
        smoothed_x = self._smooth_positions(filled_x)

        # ─── Clamp speed ──────────────────────────────────────
        clamped_x = self._clamp_speed(smoothed_x)

        # ─── Convert to pixel crop coordinates ─────────────────
        # Calculate the crop window size
        # We want to crop a 9:16 region from the source
        crop_w = int(src_h * self.ASPECT)  # Width of crop for 9:16 at source height
        crop_h = src_h

        # If source is narrower than needed crop width, adjust
        if crop_w > src_w:
            crop_w = src_w
            crop_h = int(src_w / self.ASPECT)

        max_crop_x = max(0, src_w - crop_w)
        max_crop_y = max(0, src_h - crop_h)

        keyframes: List[CropKeyframe] = []
        for i, (t, cx) in enumerate(zip(timestamps, clamped_x)):
            # Convert normalized x to crop_x pixel position
            # cx is where the subject center is (0.0 to 1.0)
            # We want the crop window centered on the subject
            subject_px = cx * src_w
            crop_x = int(subject_px - crop_w / 2)

            # Clamp to valid range
            crop_x = max(0, min(max_crop_x, crop_x))
            crop_y = max(0, min(max_crop_y, (src_h - crop_h) // 2))

            keyframes.append(CropKeyframe(
                timestamp=t + (detections[0].timestamp if detections else 0),
                crop_x=crop_x,
                crop_y=crop_y,
            ))

        return keyframes

    def _interpolate_gaps(
        self, positions: List[float], has_detection: List[bool]
    ) -> List[float]:
        """
        Fills gaps in position data where no face was detected.
        Uses linear interpolation between known points.
        If no faces detected at all, returns all 0.5 (center).
        """
        n = len(positions)
        result = positions.copy()

        # Find indices with valid detections
        valid_indices = [i for i in range(n) if has_detection[i]]

        if not valid_indices:
            return [0.5] * n

        # Fill leading gap
        for i in range(0, valid_indices[0]):
            result[i] = result[valid_indices[0]]

        # Fill trailing gap
        for i in range(valid_indices[-1] + 1, n):
            result[i] = result[valid_indices[-1]]

        # Fill interior gaps with linear interpolation
        for idx in range(len(valid_indices) - 1):
            start_i = valid_indices[idx]
            end_i = valid_indices[idx + 1]

            if end_i - start_i <= 1:
                continue

            start_val = result[start_i]
            end_val = result[end_i]

            for i in range(start_i + 1, end_i):
                t = (i - start_i) / (end_i - start_i)
                result[i] = start_val + t * (end_val - start_val)

        return result

    def _smooth_positions(self, positions: List[float]) -> List[float]:
        """
        Applies exponential moving average for smooth camera movement.
        Uses bidirectional pass for zero-lag smoothing.
        """
        n = len(positions)
        if n <= 2:
            return positions.copy()

        alpha = 2.0 / (self.SMOOTHING_WINDOW + 1)

        # Forward pass
        forward = [0.0] * n
        forward[0] = positions[0]
        for i in range(1, n):
            forward[i] = alpha * positions[i] + (1 - alpha) * forward[i - 1]

        # Backward pass
        backward = [0.0] * n
        backward[-1] = positions[-1]
        for i in range(n - 2, -1, -1):
            backward[i] = alpha * positions[i] + (1 - alpha) * backward[i + 1]

        # Average both passes (zero-lag)
        smoothed = [(f + b) / 2.0 for f, b in zip(forward, backward)]

        return smoothed

    def _clamp_speed(self, positions: List[float]) -> List[float]:
        """
        Limits the maximum movement speed between consecutive frames
        to prevent jarring jumps when the subject changes.
        """
        n = len(positions)
        if n <= 1:
            return positions.copy()

        clamped = [positions[0]]
        for i in range(1, n):
            delta = positions[i] - clamped[i - 1]
            if abs(delta) > self.MAX_SPEED:
                delta = self.MAX_SPEED if delta > 0 else -self.MAX_SPEED
            clamped.append(clamped[i - 1] + delta)

        return clamped

    # ─── Render ────────────────────────────────────────────────

    def _render_with_crop_trajectory(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        src_w: int,
        src_h: int,
        crop_data: List[CropKeyframe],
        output_path: str,
        on_progress: Optional[Callable] = None,
    ):
        """
        Renders the final clip using FFmpeg with a dynamic crop filter.

        Strategy: Build a complex FFmpeg filter that interpolates between
        crop keyframes using the sendcmd/zmq approach, or more practically,
        use a cropdetect-style approach with a pre-generated crop script.

        For reliability, we use the xstack/overlay approach:
        - Generate a crop position file
        - Use FFmpeg's crop filter with expressions that read from the data
        """
        duration = end_time - start_time

        # Calculate crop dimensions
        crop_w = int(src_h * self.ASPECT)
        crop_h = src_h
        if crop_w > src_w:
            crop_w = src_w
            crop_h = int(src_w / self.ASPECT)

        if not crop_data or len(crop_data) < 2:
            # Static center crop fallback
            crop_x = max(0, (src_w - crop_w) // 2)
            crop_y = max(0, (src_h - crop_h) // 2)
            vf = (
                f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y},"
                f"scale={self.OUT_W}:{self.OUT_H}:flags=lanczos,"
                f"setsar=1"
            )
        else:
            # Dynamic crop using FFmpeg expression
            # We encode the trajectory as a piecewise linear function in FFmpeg's expression language
            crop_x_expr = self._build_ffmpeg_expression(crop_data, duration)
            crop_y = max(0, (src_h - crop_h) // 2)

            vf = (
                f"crop={crop_w}:{crop_h}:{crop_x_expr}:{crop_y},"
                f"scale={self.OUT_W}:{self.OUT_H}:flags=lanczos,"
                f"setsar=1"
            )

        cmd = [
            "ffmpeg", "-y",
            "-ss", self._format_ts(start_time),
            "-i", source_path,
            "-t", self._format_ts(duration),
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-profile:v", "high",
            "-level", "4.0",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-ac", "2",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            output_path,
        ]

        try:
            if on_progress:
                on_progress(55, "Encoding smart-reframed clip...")

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=600
            )

            if result.returncode != 0:
                # If complex expression fails, fall back to center crop
                print(f"Smart crop FFmpeg failed, falling back to center crop: {result.stderr[-300:]}")
                self._render_center_crop(
                    source_path, start_time, end_time,
                    src_w, src_h, output_path
                )

            if on_progress:
                on_progress(95, "Finalizing...")

            # Verify output
            if not os.path.exists(output_path) or os.path.getsize(output_path) < 5000:
                self._render_center_crop(
                    source_path, start_time, end_time,
                    src_w, src_h, output_path
                )

        except subprocess.TimeoutExpired:
            self._render_center_crop(
                source_path, start_time, end_time,
                src_w, src_h, output_path
            )

    def _build_ffmpeg_expression(
        self, crop_data: List[CropKeyframe], duration: float
    ) -> str:
        """
        Builds an FFmpeg expression for dynamic crop_x that interpolates
        between keyframe positions over time.

        FFmpeg expressions use 't' for current time in seconds.
        We build a piecewise linear function using if/then/else chains.

        To avoid overly complex expressions, we sample at 1-second intervals
        and let FFmpeg interpolate between them.
        """
        if not crop_data:
            return "0"

        # Resample to ~1 second intervals for manageable expression size
        interval = max(0.5, duration / min(len(crop_data), 60))
        sampled: List[Tuple[float, int]] = []

        base_time = crop_data[0].timestamp

        for i, kf in enumerate(crop_data):
            t = kf.timestamp - base_time
            if not sampled or (t - sampled[-1][0]) >= interval * 0.9:
                sampled.append((round(t, 2), kf.crop_x))

        # Ensure we have start and end
        if sampled[0][0] > 0.01:
            sampled.insert(0, (0, sampled[0][1]))
        if sampled[-1][0] < duration - 0.1:
            sampled.append((round(duration, 2), sampled[-1][1]))

        # If only one or two keyframes, simple expression
        if len(sampled) <= 1:
            return str(sampled[0][1])

        if len(sampled) == 2:
            t0, x0 = sampled[0]
            t1, x1 = sampled[1]
            if x0 == x1:
                return str(x0)
            slope = (x1 - x0) / max(0.01, t1 - t0)
            return f"trunc({x0}+{slope:.4f}*t)"

        # Build piecewise linear expression
        # For N segments, build: if(lt(t,t1), lerp0, if(lt(t,t2), lerp1, ...))
        # Limit to ~30 segments max to avoid expression length issues
        if len(sampled) > 30:
            step = len(sampled) / 30
            reduced = [sampled[int(i * step)] for i in range(30)]
            if sampled[-1] not in reduced:
                reduced.append(sampled[-1])
            sampled = reduced

        # Build from inside out (last segment is the else case)
        t_last, x_last = sampled[-1]
        t_prev, x_prev = sampled[-2]
        slope = (x_last - x_prev) / max(0.01, t_last - t_prev)
        expr = f"trunc({x_prev}+{slope:.4f}*(t-{t_prev}))"

        for i in range(len(sampled) - 2, 0, -1):
            t0, x0 = sampled[i - 1]
            t1, x1 = sampled[i]
            slope = (x1 - x0) / max(0.01, t1 - t0)
            segment = f"trunc({x0}+{slope:.4f}*(t-{t0}))"
            expr = f"if(lt(t,{t1}),{segment},{expr})"

        return f"'{expr}'"

    def _render_center_crop(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        src_w: int,
        src_h: int,
        output_path: str,
    ):
        """Fallback: simple center crop without tracking."""
        duration = end_time - start_time
        crop_w = int(src_h * self.ASPECT)
        crop_h = src_h
        if crop_w > src_w:
            crop_w = src_w
            crop_h = int(src_w / self.ASPECT)

        crop_x = max(0, (src_w - crop_w) // 2)
        crop_y = max(0, (src_h - crop_h) // 2)

        vf = (
            f"crop={crop_w}:{crop_h}:{crop_x}:{crop_y},"
            f"scale={self.OUT_W}:{self.OUT_H}:flags=lanczos,"
            f"setsar=1"
        )

        cmd = [
            "ffmpeg", "-y",
            "-ss", self._format_ts(start_time),
            "-i", source_path,
            "-t", self._format_ts(duration),
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-profile:v", "high",
            "-level", "4.0",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-ac", "2",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            output_path,
        ]

        subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    # ─── Helpers ───────────────────────────────────────────────

    def _probe_dimensions(self, filepath: str) -> Dict[str, int]:
        """Get video width and height using ffprobe."""
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", "-select_streams", "v:0",
            filepath,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                streams = data.get("streams", [])
                if streams:
                    return {
                        "width": int(streams[0].get("width", 0)),
                        "height": int(streams[0].get("height", 0)),
                    }
        except Exception:
            pass
        return {"width": 0, "height": 0}

    @staticmethod
    def _format_ts(seconds: float) -> str:
        if seconds < 0:
            seconds = 0
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"

    def cleanup(self):
        """Release MediaPipe resources."""
        if self._detector:
            self._detector.close()
            self._detector = None


# Singleton
reframe_service = ReframeService()
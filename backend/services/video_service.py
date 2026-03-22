"""
Video operations service.
Handles downloading via yt-dlp (Python API) and cutting via FFmpeg.
Integrates AI smart reframing for 9:16 vertical clips.
"""

import subprocess
import json
import os
import re
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass

try:
    import yt_dlp
    HAS_YT_DLP = True
except ImportError:
    HAS_YT_DLP = False

from config import settings


@dataclass
class VideoInfo:
    filepath: str
    duration: float
    width: int
    height: int
    fps: float
    codec: str
    filesize: int
    title: str


class VideoServiceError(Exception):
    pass


class DependencyMissingError(VideoServiceError):
    pass


class VideoService:
    OUTPUT_WIDTH = 720
    OUTPUT_HEIGHT = 1280

    def __init__(self):
        self._missing_deps: List[str] = []
        self._check_dependencies()

    def _check_dependencies(self):
        self._missing_deps = []
        if not shutil.which("ffmpeg"):
            self._missing_deps.append("ffmpeg")
        if not shutil.which("ffprobe"):
            self._missing_deps.append("ffprobe")
        if not HAS_YT_DLP:
            self._missing_deps.append("yt-dlp")

        if self._missing_deps:
            print(f"\n  WARNING: Missing: {', '.join(self._missing_deps)}")

    @property
    def is_ready(self) -> bool:
        return len(self._missing_deps) == 0

    @property
    def missing_dependencies(self) -> List[str]:
        return self._missing_deps.copy()

    def _require_tool(self, tool: str):
        if tool in self._missing_deps:
            raise DependencyMissingError(f"'{tool}' is not installed.")

    # ─── Download ──────────────────────────────────────────────

    def download_video(
        self,
        video_url: str,
        project_id: str,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> VideoInfo:
        self._require_tool("yt-dlp")

        output_dir = settings.uploads_path / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        output_template = str(output_dir / "source.%(ext)s")

        download_state = {"percent": 0.0, "error": None}

        def progress_hook(d: dict):
            status = d.get("status", "")
            if status == "downloading":
                pct_str = d.get("_percent_str", "0%").strip().replace("%", "")
                try:
                    download_state["percent"] = float(pct_str)
                except (ValueError, TypeError):
                    pass
                if on_progress:
                    speed = d.get("_speed_str", "")
                    eta = d.get("_eta_str", "")
                    msg = f"Downloading: {download_state['percent']:.1f}%"
                    if speed:
                        msg += f" at {speed}"
                    if eta:
                        msg += f" (ETA: {eta})"
                    on_progress(download_state["percent"], msg)
            elif status == "finished":
                download_state["percent"] = 100.0
                if on_progress:
                    on_progress(100.0, "Download complete, processing...")
            elif status == "error":
                download_state["error"] = d.get("error", "Download error")

        ydl_opts = {
            "format": (
                f"bestvideo[height<={settings.video_quality}][ext=mp4]"
                f"+bestaudio[ext=m4a]/"
                f"bestvideo[height<={settings.video_quality}]+bestaudio/"
                f"best[height<={settings.video_quality}][ext=mp4]/"
                f"best[ext=mp4]/best"
            ),
            "merge_output_format": "mp4",
            "outtmpl": output_template,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "progress_hooks": [progress_hook],
            "retries": 10,
            "fragment_retries": 10,
            "file_access_retries": 5,
            "socket_timeout": 60,
            "http_chunk_size": 10485760,
            "no_check_certificates": True,
            "postprocessors": [{
                "key": "FFmpegVideoConvertor",
                "preferedformat": "mp4",
            }] if shutil.which("ffmpeg") else [],
        }

        try:
            if on_progress:
                on_progress(0, "Starting download...")

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(video_url, download=False)
                except Exception as e:
                    error_str = str(e).lower()
                    if "unavailable" in error_str or "private" in error_str:
                        raise VideoServiceError("Video is unavailable or private.")
                    if "age" in error_str:
                        raise VideoServiceError("Video is age-restricted.")
                    raise VideoServiceError(f"Cannot access video: {str(e)[:200]}")

                if not info:
                    raise VideoServiceError("Could not extract video information.")

                video_title = info.get("title", "Untitled Video")
                video_duration = info.get("duration", 0)

                if on_progress:
                    on_progress(1, f"Found: {video_title}")

                if video_duration and video_duration > settings.max_video_duration:
                    raise VideoServiceError(
                        f"Video too long ({video_duration // 60} min). Max: {settings.max_video_duration // 60} min."
                    )

                info = ydl.extract_info(video_url, download=True)

            if download_state["error"]:
                raise VideoServiceError(f"Download failed: {download_state['error']}")

            filepath = self._find_downloaded_file(output_dir)
            if not filepath:
                raise VideoServiceError("File not found after download.")

            file_size = os.path.getsize(filepath)
            if file_size < 10000:
                raise VideoServiceError(f"Downloaded file too small ({file_size} bytes).")

            probe_info = self.probe_video(str(filepath))

            return VideoInfo(
                filepath=str(filepath),
                duration=probe_info.get("duration", 0) or video_duration or 0,
                width=probe_info.get("width", info.get("width", 0)),
                height=probe_info.get("height", info.get("height", 0)),
                fps=probe_info.get("fps", 30.0),
                codec=probe_info.get("codec", "h264"),
                filesize=file_size,
                title=video_title,
            )

        except VideoServiceError:
            raise
        except Exception as e:
            raise VideoServiceError(f"Download error: {str(e)[:300]}")

    def _find_downloaded_file(self, directory: Path) -> Optional[Path]:
        for ext in ["mp4", "mkv", "webm", "mov"]:
            for f in directory.glob(f"source.{ext}"):
                if f.stat().st_size > 1000:
                    return f
        candidates = [
            f for f in directory.iterdir()
            if f.suffix.lower() in {".mp4", ".mkv", ".webm", ".mov"} and f.stat().st_size > 1000
        ]
        return max(candidates, key=lambda f: f.stat().st_size) if candidates else None

    # ─── Probe ─────────────────────────────────────────────────

    def probe_video(self, filepath: str) -> Dict[str, Any]:
        if "ffprobe" in self._missing_deps:
            return {"duration": 0, "width": 0, "height": 0, "fps": 30.0, "codec": "unknown"}

        cmd = [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", "-show_streams", str(filepath),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                return {"duration": 0, "width": 0, "height": 0, "fps": 30.0, "codec": "unknown"}

            data = json.loads(result.stdout)
            video_stream = next(
                (s for s in data.get("streams", []) if s.get("codec_type") == "video"), None
            )
            if not video_stream:
                dur = float(data.get("format", {}).get("duration", 0))
                return {"duration": dur, "width": 0, "height": 0, "fps": 30.0, "codec": "unknown"}

            fps = 30.0
            rfr = video_stream.get("r_frame_rate", "30/1")
            if "/" in rfr:
                parts = rfr.split("/")
                if len(parts) == 2 and float(parts[1]) > 0:
                    fps = float(parts[0]) / float(parts[1])

            dur = float(video_stream.get("duration", 0) or data.get("format", {}).get("duration", 0))

            return {
                "duration": dur,
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": round(fps, 2),
                "codec": video_stream.get("codec_name", "unknown"),
            }
        except Exception:
            return {"duration": 0, "width": 0, "height": 0, "fps": 30.0, "codec": "unknown"}

    # ─── Smart Reframe Clip ────────────────────────────────────

    def cut_clip_vertical(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        output_path: str,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> str:
        """
        Creates a 9:16 vertical clip.
        Uses AI smart reframing if available, falls back to center crop.
        """
        self._require_tool("ffmpeg")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Try smart reframing first
        from services.reframe_service import reframe_service

        if reframe_service.is_available:
            try:
                if on_progress:
                    on_progress(0, "Smart reframing with AI subject tracking...")

                reframe_service.reframe_clip(
                    source_path=source_path,
                    start_time=start_time,
                    end_time=end_time,
                    output_path=output_path,
                    on_progress=on_progress,
                )

                # Verify output
                if os.path.exists(output_path) and os.path.getsize(output_path) > 5000:
                    probe = self.probe_video(output_path)
                    if probe.get("duration", 0) > 0.5:
                        return output_path

                # If verification failed, fall through to center crop
                print("Smart reframe output invalid, falling back to center crop.")

            except Exception as e:
                print(f"Smart reframe failed ({e}), falling back to center crop.")
                if os.path.exists(output_path):
                    os.remove(output_path)

        # Fallback: center crop
        return self._center_crop(source_path, start_time, end_time, output_path)

    def _center_crop(
        self,
        source_path: str,
        start_time: float,
        end_time: float,
        output_path: str,
    ) -> str:
        """Simple center crop to 9:16."""
        duration = end_time - start_time
        w, h = self.OUTPUT_WIDTH, self.OUTPUT_HEIGHT

        vf = (
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h}:(iw-{w})/2:(ih-{h})/2,"
            f"setsar=1"
        )

        cmd = [
            "ffmpeg", "-y",
            "-ss", self._format_timestamp(start_time),
            "-i", str(source_path),
            "-t", self._format_timestamp(duration),
            "-vf", vf,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            raise VideoServiceError(f"FFmpeg failed: {result.stderr[-400:]}")

        if not os.path.exists(output_path) or os.path.getsize(output_path) < 5000:
            raise VideoServiceError("Output file invalid.")

        return output_path

    # ─── Thumbnail ─────────────────────────────────────────────

    def generate_thumbnail(
        self, video_path: str, output_path: str, timestamp: float = 0,
    ) -> str:
        if "ffmpeg" in self._missing_deps:
            return ""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        w, h = self.OUTPUT_WIDTH, self.OUTPUT_HEIGHT
        vf = (
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h}:(iw-{w})/2:(ih-{h})/2"
        )
        cmd = [
            "ffmpeg", "-y",
            "-ss", self._format_timestamp(timestamp),
            "-i", str(video_path),
            "-vframes", "1", "-vf", vf, "-q:v", "2",
            str(output_path),
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 500:
                return output_path
        except Exception:
            pass
        return ""

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        if seconds < 0:
            seconds = 0
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = seconds % 60
        return f"{h:02d}:{m:02d}:{s:06.3f}"

    def cleanup_project_files(self, project_id: str):
        for base_dir in [settings.uploads_path, settings.clips_path, settings.thumbnails_path]:
            d = base_dir / project_id
            if d.exists():
                shutil.rmtree(d, ignore_errors=True)


video_service = VideoService()
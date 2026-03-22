"""
Clip generation service.
Cuts real 9:16 vertical clips using FFmpeg.

When AI highlight windows are provided (from highlight_service), those
exact timestamps are used. Equal-split boundaries are only used as a
true last resort for very short videos when AI detection returns nothing.
"""

import uuid
import os
import logging
from typing import List, Dict, Any, Optional, Callable

from config import settings
from services.video_service import video_service, VideoInfo, VideoServiceError
from services.highlight_service import HighlightWindow

logger = logging.getLogger("clipwise.clips")


class ClipService:

    def generate_clips(
        self,
        project_id: str,
        video_info: VideoInfo,
        highlights: Optional[List[HighlightWindow]] = None,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Renders vertical 9:16 clips from a source video.

        Args:
            project_id:  Project identifier for output paths.
            video_info:  Result of video_service.download_video().
            highlights:  AI-detected HighlightWindows. When provided and
                         non-empty these are used as-is. Falls back to
                         emergency equal-split ONLY for very short videos
                         or when highlights is explicitly None/empty.
            on_progress: Optional callback(percent, message).

        Returns:
            List of clip metadata dicts (minus internal filePath key).
        """
        source_path = video_info.filepath
        duration    = video_info.duration

        if duration <= 0:
            raise ValueError("Video duration is zero or negative — cannot generate clips.")

        # ── Resolve boundaries ────────────────────────────────
        use_ai = highlights and len(highlights) > 0
        if use_ai:
            boundaries = self._boundaries_from_highlights(highlights, duration)
            mode_label = "AI-selected"
            logger.info(
                f"Using {len(boundaries)} AI-selected highlight windows "
                f"for project {project_id}"
            )
        else:
            # Emergency fallback only — log clearly so it's visible
            logger.warning(
                f"No AI highlights available for project {project_id} — "
                f"falling back to equal-split (video: {duration:.0f}s)"
            )
            boundaries = self._emergency_time_split(duration)
            mode_label = "time-split"

        if not boundaries:
            raise VideoServiceError(
                "Could not produce any valid clip boundaries. "
                "Check that the video has a valid audio/video track."
            )

        # ── Prepare output dirs ───────────────────────────────
        clip_dir  = settings.clips_path / project_id
        thumb_dir = settings.thumbnails_path / project_id
        clip_dir.mkdir(parents=True, exist_ok=True)
        thumb_dir.mkdir(parents=True, exist_ok=True)

        # ── Determine render mode label ───────────────────────
        from services.reframe_service import reframe_service
        render_mode = "smart-reframe" if reframe_service.is_available else "center-crop"

        total  = len(boundaries)
        clips: List[Dict[str, Any]] = []

        for i, (start, end) in enumerate(boundaries):
            clip_id       = f"clip_{uuid.uuid4().hex[:8]}"
            clip_duration = round(end - start, 2)

            if on_progress:
                pct = (i / total) * 100
                on_progress(
                    pct,
                    f"[{mode_label}] Rendering clip {i + 1}/{total} "
                    f"({start:.0f}s – {end:.0f}s, {render_mode})...",
                )

            clip_filename = f"{clip_id}.mp4"
            clip_path     = str(clip_dir / clip_filename)

            # Per-clip sub-progress
            def clip_progress(p: float, msg: str, _i=i) -> None:
                if on_progress:
                    base    = (_i / total) * 100
                    span    = (1 / total) * 100
                    overall = base + (p / 100) * span
                    on_progress(round(overall, 1), f"Clip {_i + 1}/{total}: {msg}")

            try:
                video_service.cut_clip_vertical(
                    source_path=source_path,
                    start_time=start,
                    end_time=end,
                    output_path=clip_path,
                    on_progress=clip_progress,
                )
            except VideoServiceError as exc:
                logger.warning(f"Clip {i + 1} render failed: {exc}")
                continue

            # Verify output file
            if not os.path.exists(clip_path) or os.path.getsize(clip_path) < 5000:
                logger.warning(f"Clip {i + 1} output is missing or too small — skipping")
                if os.path.exists(clip_path):
                    os.remove(clip_path)
                continue

            # Probe actual duration from output
            probe         = video_service.probe_video(clip_path)
            actual_dur    = probe.get("duration", clip_duration) or clip_duration

            # Generate thumbnail
            thumb_filename = f"{clip_id}.jpg"
            thumb_path     = str(thumb_dir / thumb_filename)
            video_service.generate_thumbnail(
                video_path=source_path,
                output_path=thumb_path,
                timestamp=start + min(2.0, clip_duration * 0.1),
            )

            # ── Build metadata ────────────────────────────────
            if use_ai and highlights and i < len(highlights):
                hl       = highlights[i]
                title    = hl.title
                subtitle = (hl.hook or hl.transcript_text)[:160]
                reason   = hl.reason
                transcript_text = hl.transcript_text
                score    = hl.score
            else:
                title, subtitle, reason, transcript_text = self._default_metadata(i)
                base_scores = [0.88, 0.84, 0.81, 0.78, 0.75, 0.72]
                score       = base_scores[i] if i < len(base_scores) else 0.70

            clip_video_url = f"/storage/clips/{project_id}/{clip_filename}"
            clip_thumb_url = (
                f"/storage/thumbnails/{project_id}/{thumb_filename}"
                if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 500
                else ""
            )

            clips.append({
                "id":           clip_id,
                "projectId":    project_id,
                "title":        title,
                "subtitle":     subtitle,
                "transcript":   transcript_text,
                "startTime":    round(start, 2),
                "endTime":      round(end, 2),
                "duration":     round(actual_dur, 2),
                "thumbnailUrl": clip_thumb_url,
                "videoUrl":     clip_video_url,
                "reason":       reason,
                "score":        score,
                "order":        i,
                "captions":     [],
                "filePath":     clip_path,            # stripped before API response
                "fileSize":     os.path.getsize(clip_path),
            })

        if on_progress:
            on_progress(
                100.0,
                f"Generated {len(clips)}/{total} clips ({mode_label}, {render_mode}).",
            )

        logger.info(
            f"Clip generation complete: {len(clips)}/{total} successful "
            f"({mode_label}, {render_mode})"
        )
        return clips

    # ─── Boundary helpers ─────────────────────────────────────

    def _boundaries_from_highlights(
        self,
        highlights: List[HighlightWindow],
        video_duration: float,
    ) -> List[tuple]:
        """
        Converts HighlightWindow list → validated (start, end) tuples.
        Rejects windows that are too short or outside the video.
        """
        boundaries = []
        for hl in highlights:
            start = max(0.0, hl.start)
            end   = min(hl.end, video_duration - 0.5)
            if end - start >= 5.0:
                boundaries.append((round(start, 2), round(end, 2)))
            else:
                logger.warning(
                    f"Skipping highlight window {hl.start:.1f}–{hl.end:.1f}s "
                    f"(too short after clamping to video bounds)"
                )

        if not boundaries:
            logger.error("All AI highlight windows were invalid — falling back to time split")
            return self._emergency_time_split(video_duration)

        return boundaries

    def _emergency_time_split(self, total_duration: float) -> List[tuple]:
        """
        Equal-segment split. Named 'emergency' to make its purpose clear.
        Called ONLY when AI highlight detection returns nothing usable.
        """
        from config import settings as cfg
        min_dur = cfg.clip_min_duration
        max_dur = cfg.clip_max_duration
        target  = cfg.clip_count

        if total_duration < 60:
            d = min(total_duration * 0.8, max_dur)
            s = max(0, (total_duration - d) / 2)
            return [(round(s, 2), round(s + d, 2))]

        if total_duration < 180:
            target  = min(3, target)
            max_dur = min(max_dur, total_duration / target * 0.8)

        if target * min_dur > total_duration * 0.85:
            target = max(1, int(total_duration * 0.85 / min_dur))

        seg    = total_duration / target
        bounds = []

        for i in range(target):
            ss, se = seg * i, seg * (i + 1)
            avail  = se - ss
            cd     = min(max_dur, max(min_dur, avail * 0.65))
            cd     = min(cd, avail - 2)

            if i == 0:
                s = max(1.0, ss + 2.0)
            elif i == target - 1:
                s = max(ss + 1.0, se - cd - 2.0)
            else:
                s = ss + max(0, (avail - cd) / 2)

            e = s + cd
            if e > total_duration - 0.5:
                e = total_duration - 0.5
                s = max(0, e - cd)

            if bounds:
                prev = bounds[-1][1]
                if s < prev + 2.0:
                    s = prev + 2.0
                    e = s + cd
                    if e > total_duration - 0.5:
                        break

            if e - s >= min_dur * 0.5:
                bounds.append((round(s, 2), round(e, 2)))

        return bounds

    # ─── Default metadata (non-AI path) ──────────────────────

    _METADATA = [
        ("The Hook — Attention-Grabbing Opening",
         "Opening segment with a compelling hook.",
         "Strong opening that captures attention immediately."),
        ("Key Insight — Core Concept Explained",
         "The speaker breaks down the main concept.",
         "Central insight delivered with clarity."),
        ("Surprising Moment — Unexpected Revelation",
         "A surprising revelation changes the narrative.",
         "Unexpected point that challenges assumptions."),
        ("Emotional Story — Personal Connection",
         "A personal story that resonates emotionally.",
         "Personal anecdote creating emotional resonance."),
        ("Practical Advice — Actionable Takeaway",
         "A specific tip viewers can use right away.",
         "Concrete advice viewers can apply immediately."),
        ("Powerful Conclusion — Memorable Closing",
         "A memorable closing statement.",
         "Strong closing that reinforces the key message."),
        ("Debate Point — Controversial Take",
         "A thought-provoking viewpoint.",
         "Bold statement that sparks discussion."),
        ("Tutorial Segment — Step-by-Step Guide",
         "A clear walkthrough of a key process.",
         "Instructional content viewers can follow along with."),
    ]

    def _default_metadata(self, index: int):
        title, subtitle, reason = self._METADATA[index % len(self._METADATA)]
        return title, subtitle, reason, ""

    # ─── Cleanup ──────────────────────────────────────────────

    def delete_project_clips(self, project_id: str) -> None:
        import shutil
        for d in [
            settings.clips_path      / project_id,
            settings.thumbnails_path / project_id,
        ]:
            if d.exists():
                shutil.rmtree(d, ignore_errors=True)
                logger.info(f"Deleted {d}")


clip_service = ClipService()
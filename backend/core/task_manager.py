"""
Background task manager.
Runs the full AI processing pipeline in daemon threads.

Real pipeline:
  Stage 1 — Fetch       (0–20%)   yt-dlp download
  Stage 2 — Transcribe  (20–40%)  FFmpeg audio extract + Whisper
  Stage 3 — Analyze     (40–65%)  Groq / Ollama / heuristic highlight detection
  Stage 4 — Generate    (65–100%) FFmpeg 9:16 clip rendering

Falls back to a simulated pipeline when FFmpeg / yt-dlp are missing.
"""

import logging
import threading
import time
import uuid
import re
import traceback
from typing import Dict, Optional, List, Any

from models.processing import ProcessingJob
from services.storage_service import storage
from config import settings

logger = logging.getLogger("clipwise.pipeline")


# ─── YouTube helpers ──────────────────────────────────────────────

_YT_PATTERNS = [
    r"^(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/live/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?m\.youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
]


def _extract_video_id(url: str) -> Optional[str]:
    for pat in _YT_PATTERNS:
        m = re.match(pat, url.strip())
        if m:
            return m.group(1)
    return None


# ─── Simulated clips (no-deps mode) ──────────────────────────────

_SIM_TEMPLATES = [
    {"title": "The Hook",         "subtitle": "Opening hook.",    "transcript": "Let me tell you something important."},
    {"title": "Key Insight",      "subtitle": "Main concept.",    "transcript": "Here is what it all comes down to."},
    {"title": "Surprising Moment","subtitle": "Surprise.",        "transcript": "This is what shocked me most."},
    {"title": "Emotional Story",  "subtitle": "Personal story.",  "transcript": "I remember the exact moment."},
    {"title": "Practical Advice", "subtitle": "Actionable tip.",  "transcript": "Here is exactly what you should do."},
    {"title": "Conclusion",       "subtitle": "Closing thought.", "transcript": "Remember this one truth."},
]


def _simulated_clips(project_id: str, video_url: str) -> List[Dict[str, Any]]:
    vid  = _extract_video_id(video_url)
    thumb = f"https://img.youtube.com/vi/{vid}/hqdefault.jpg" if vid else ""
    scores = [0.95, 0.91, 0.88, 0.84, 0.86, 0.79]
    clips  = []

    for i, t in enumerate(_SIM_TEMPLATES):
        cid   = f"clip_{uuid.uuid4().hex[:8]}"
        start = round(60 + i * 120, 1)
        dur   = round(35 + i * 5, 1)
        clips.append({
            "id":           cid,
            "projectId":    project_id,
            "title":        t["title"],
            "subtitle":     t["subtitle"],
            "transcript":   t["transcript"],
            "startTime":    start,
            "endTime":      round(start + dur, 1),
            "duration":     dur,
            "thumbnailUrl": thumb,
            "videoUrl":     "",
            "reason":       "Simulated clip (dependencies missing).",
            "score":        scores[i] if i < len(scores) else 0.70,
            "order":        i,
            "captions":     [],
        })

    return clips


# ─── Job update helper ────────────────────────────────────────────

def _upd(job_id: str, **kwargs) -> None:
    job = storage.update_job(job_id, **kwargs)
    if job:
        logger.debug(
            f"  [{job_id}] stage={kwargs.get('stage', job.stage)} "
            f"progress={kwargs.get('progress', job.progress):.1f}% "
            f"msg={kwargs.get('message', job.message)}"
        )


# ─────────────────────────────────────────────────────────────────
# REAL PIPELINE
# ─────────────────────────────────────────────────────────────────

def _run_real_pipeline(job_id: str, project_id: str, video_url: str) -> None:
    """
    Full AI pipeline:
      1. yt-dlp  download
      2. FFmpeg audio extraction + Whisper transcription
      3. Groq / Ollama / heuristic highlight detection
      4. FFmpeg 9:16 clip rendering
    """
    logger.info(f"[REAL] pipeline start — job={job_id} project={project_id}")

    try:
        from services.video_service       import video_service, VideoServiceError
        from services.audio_service       import audio_service, AudioServiceError
        from services.transcription_service import transcription_service
        from services.highlight_service   import highlight_service
        from services.clip_service        import clip_service
    except Exception as exc:
        _upd(job_id, status="failed", stage="failed",
             message="Service import error", error=str(exc))
        storage.update_project(project_id, status="error", error_message=str(exc))
        logger.error(f"[REAL] service import failed: {exc}\n{traceback.format_exc()}")
        return

    audio_path  = None
    video_info  = None

    try:
        # ══════════════════════════════════════════════════════
        # STAGE 1 — FETCH  (0 – 20 %)
        # ══════════════════════════════════════════════════════
        logger.info("[REAL] Stage 1: FETCH")
        _upd(job_id, stage="fetching", stage_progress=0.0,
             progress=0.0, message="Connecting to YouTube...")

        def _dl_prog(pct: float, msg: str) -> None:
            _upd(job_id, stage="fetching",
                 stage_progress=round(pct, 1),
                 progress=round(pct * 0.20, 1),
                 message=msg)

        video_info = video_service.download_video(
            video_url=video_url,
            project_id=project_id,
            on_progress=_dl_prog,
        )

        logger.info(
            f"[REAL] Downloaded: '{video_info.title}' "
            f"({video_info.duration:.0f}s, "
            f"{video_info.filesize / 1_048_576:.1f} MB)"
        )
        storage.update_project(
            project_id, title=video_info.title, duration=video_info.duration
        )
        _upd(job_id, stage="fetching", stage_progress=100.0,
             progress=20.0, message=f"Downloaded: {video_info.title}")

        # ══════════════════════════════════════════════════════
        # STAGE 2 — TRANSCRIBE  (20 – 40 %)
        # ══════════════════════════════════════════════════════
        logger.info("[REAL] Stage 2: TRANSCRIBE")
        _upd(job_id, stage="transcribing", stage_progress=0.0,
             progress=20.0, message="Extracting audio track...")

        transcript = None

        # 2a — audio extraction
        try:
            def _audio_prog(pct: float, msg: str) -> None:
                _upd(job_id,
                     stage_progress=round(pct * 0.20, 1),
                     progress=round(20.0 + pct * 0.05, 1),
                     message=msg)

            audio_path = audio_service.extract_audio(
                video_path=video_info.filepath,
                project_id=project_id,
                on_progress=_audio_prog,
            )
            logger.info(f"[REAL] Audio extracted: {audio_path}")
            _upd(job_id, stage_progress=20.0, progress=25.0,
                 message="Audio extracted — loading Whisper model...")

        except AudioServiceError as exc:
            logger.warning(f"[REAL] Audio extraction failed: {exc} — continuing without transcript")
            _upd(job_id, stage_progress=20.0, progress=25.0,
                 message="Audio extraction skipped — continuing without transcript")

        # 2b — Whisper transcription
        if audio_path and transcription_service.is_available:
            try:
                def _tr_prog(pct: float, msg: str) -> None:
                    _upd(job_id,
                         stage_progress=round(20.0 + pct * 0.80, 1),
                         progress=round(25.0 + pct * 0.15, 1),
                         message=msg)

                transcript = transcription_service.transcribe(
                    audio_path=audio_path,
                    model_name=settings.whisper_model,
                    on_progress=_tr_prog,
                )
                seg_count = len(transcript.segments)
                logger.info(
                    f"[REAL] Transcription done: {seg_count} segments, "
                    f"lang={transcript.language}, "
                    f"chars={len(transcript.full_text)}"
                )
                _upd(job_id, stage="transcribing", stage_progress=100.0,
                     progress=40.0,
                     message=f"Transcribed {seg_count} segments ({transcript.language})")

            except Exception as exc:
                logger.warning(f"[REAL] Transcription failed: {exc} — continuing without")
                _upd(job_id, stage="transcribing", stage_progress=100.0,
                     progress=40.0, message="Transcription skipped — continuing")

        elif not transcription_service.is_available:
            logger.warning(
                "[REAL] Whisper not installed "
                "(pip install faster-whisper) — highlight detection will use heuristics"
            )
            _upd(job_id, stage="transcribing", stage_progress=100.0,
                 progress=40.0,
                 message="Whisper not installed — skipping transcription")
        else:
            _upd(job_id, stage="transcribing", stage_progress=100.0,
                 progress=40.0,
                 message="No audio file — skipping transcription")

        # ══════════════════════════════════════════════════════
        # STAGE 3 — ANALYZE  (40 – 65 %)
        # ══════════════════════════════════════════════════════
        logger.info("[REAL] Stage 3: ANALYZE highlights")

        # Determine which AI path will be used so the UI message is accurate
        if transcript and transcript.speech_segments:
            if settings.groq_api_key:
                analyze_msg = "Sending transcript to Groq AI for highlight detection..."
            else:
                ollama_m = highlight_service._find_ollama_model()
                if ollama_m:
                    analyze_msg = f"Sending transcript to local LLM ({ollama_m})..."
                else:
                    analyze_msg = "Scoring transcript with content heuristics..."
        else:
            analyze_msg = "No transcript — using time-based clip selection..."

        _upd(job_id, stage="analyzing", stage_progress=0.0,
             progress=40.0, message=analyze_msg)

        highlights = None
        if transcript is not None:
            try:
                def _hl_prog(pct: float, msg: str) -> None:
                    _upd(job_id,
                         stage_progress=round(pct, 1),
                         progress=round(40.0 + pct * 0.25, 1),
                         message=msg)

                highlights = highlight_service.detect_highlights(
                    transcript=transcript,
                    video_duration=video_info.duration,
                    on_progress=_hl_prog,
                )

                logger.info(f"[REAL] Highlight detection returned {len(highlights)} windows:")
                for i, hl in enumerate(highlights):
                    logger.info(
                        f"  [{i+1}] {hl.start:.1f}s – {hl.end:.1f}s "
                        f"score={hl.score:.2f} '{hl.title}'"
                    )

                _upd(job_id, stage="analyzing", stage_progress=100.0,
                     progress=65.0,
                     message=f"Identified {len(highlights)} highlight windows")

            except Exception as exc:
                logger.warning(f"[REAL] Highlight detection failed: {exc} — clip service will use time-split")
                _upd(job_id, stage="analyzing", stage_progress=100.0,
                     progress=65.0, message="Highlight detection failed — using time-split")
                highlights = None
        else:
            _upd(job_id, stage="analyzing", stage_progress=100.0,
                 progress=65.0, message="No transcript — clip service will use time-split")

        # ══════════════════════════════════════════════════════
        # STAGE 4 — GENERATE CLIPS  (65 – 100 %)
        # ══════════════════════════════════════════════════════
        ai_label = "AI-selected" if highlights else "time-split"
        logger.info(f"[REAL] Stage 4: GENERATE clips ({ai_label})")
        _upd(job_id, stage="generating", stage_progress=0.0,
             progress=65.0,
             message=f"Rendering 9:16 clips ({ai_label})...")

        def _clip_prog(pct: float, msg: str) -> None:
            _upd(job_id,
                 stage_progress=round(pct, 1),
                 progress=round(65.0 + pct * 0.33, 1),
                 message=msg)

        clips = clip_service.generate_clips(
            project_id=project_id,
            video_info=video_info,
            highlights=highlights,
            on_progress=_clip_prog,
        )

        if not clips:
            raise VideoServiceError(
                "No clips were generated. "
                "The video may lack a valid audio/video track, "
                "or all FFmpeg render attempts failed."
            )

        # Strip internal-only key before storing/returning
        clean = [{k: v for k, v in c.items() if k != "filePath"} for c in clips]

        n    = len(clean)
        word = "clip" if n == 1 else "clips"
        logger.info(f"[REAL] COMPLETE: {n} {word} ({ai_label})")

        _upd(job_id,
             status="completed", stage="completed",
             progress=100.0, stage_progress=100.0,
             message=f"Done! {n} {word} generated ({ai_label}).",
             clips=clean, estimated_time_remaining=0)

        storage.update_project(project_id, status="completed", clip_count=n)

    except Exception as exc:
        msg = str(exc)
        logger.error(f"[REAL] FAILED: {msg}\n{traceback.format_exc()}")
        _upd(job_id, status="failed", stage="failed",
             message="Processing failed", error=msg)
        storage.update_project(project_id, status="error", error_message=msg)
        # Clean up downloaded source on hard failure
        try:
            video_service.cleanup_project_files(project_id)
        except Exception:
            pass

    finally:
        # Always remove extracted audio (can be hundreds of MB)
        if audio_path:
            try:
                from services.audio_service import audio_service as _as
                _as.cleanup(project_id)
            except Exception:
                pass


# ─────────────────────────────────────────────────────────────────
# SIMULATED PIPELINE  (missing FFmpeg / yt-dlp)
# ─────────────────────────────────────────────────────────────────

def _run_simulated_pipeline(job_id: str, project_id: str, video_url: str) -> None:
    logger.info(f"[SIM] pipeline start — job={job_id}")

    try:
        vid = _extract_video_id(video_url)
        if vid:
            storage.update_project(
                project_id,
                title=f"YouTube Video ({vid})",
                duration=900.0,
            )

        stages = [
            ("fetching",     "Simulating download...",        2.5,  0, 25),
            ("transcribing", "Simulating transcription...",   3.0, 25, 50),
            ("analyzing",    "Simulating AI analysis...",     2.5, 50, 75),
            ("generating",   "Simulating clip generation...", 2.0, 75, 100),
        ]

        for stage_name, msg, dur, p0, p1 in stages:
            logger.info(f"[SIM] Stage: {stage_name}")
            _upd(job_id, stage=stage_name, stage_progress=0.0,
                 progress=float(p0), message=msg)

            elapsed, tick = 0.0, 0.2
            while elapsed < dur:
                time.sleep(tick)
                elapsed += tick
                frac = min(elapsed / dur, 1.0)
                _upd(job_id,
                     stage_progress=round(frac * 100, 1),
                     progress=round(p0 + (p1 - p0) * frac, 1))

        clips = _simulated_clips(project_id, video_url)
        logger.info(f"[SIM] COMPLETE: {len(clips)} simulated clips")

        _upd(job_id,
             status="completed", stage="completed",
             progress=100.0, stage_progress=100.0,
             message=f"Done! {len(clips)} clips (simulated — install FFmpeg to get real clips).",
             clips=clips, estimated_time_remaining=0)

        storage.update_project(project_id, status="completed", clip_count=len(clips))

    except Exception as exc:
        logger.error(f"[SIM] FAILED: {exc}\n{traceback.format_exc()}")
        _upd(job_id, status="failed", stage="failed",
             message="Simulated processing failed", error=str(exc))
        storage.update_project(project_id, status="error", error_message=str(exc))


# ─────────────────────────────────────────────────────────────────
# ROUTER  (chooses real vs simulated)
# ─────────────────────────────────────────────────────────────────

def run_processing_pipeline(job_id: str, project_id: str, video_url: str) -> None:
    """
    Entry point for background threads.
    Routes to real or simulated pipeline. MUST NOT raise — all exceptions
    are caught inside the individual pipeline functions.
    """
    logger.info("=" * 60)
    logger.info("PIPELINE THREAD STARTED")
    logger.info(f"  Job:     {job_id}")
    logger.info(f"  Project: {project_id}")
    logger.info(f"  Thread:  {threading.current_thread().name}")
    logger.info("=" * 60)

    try:
        from services.video_service import video_service
        is_ready = video_service.is_ready
        missing  = video_service.missing_dependencies
    except Exception as exc:
        logger.error(f"Cannot import video_service: {exc}")
        is_ready = False
        missing  = ["video_service (import failed)"]

    if is_ready:
        logger.info("Routing to REAL pipeline")
        _run_real_pipeline(job_id, project_id, video_url)
    else:
        logger.warning(f"Routing to SIMULATED pipeline (missing: {', '.join(missing)})")
        _run_simulated_pipeline(job_id, project_id, video_url)

    logger.info(f"PIPELINE THREAD FINISHED — job={job_id}")


# ─────────────────────────────────────────────────────────────────
# TASK MANAGER
# ─────────────────────────────────────────────────────────────────

class TaskManager:
    """Manages background processing threads."""

    def __init__(self) -> None:
        self._threads: Dict[str, threading.Thread] = {}
        self._lock = threading.Lock()
        logger.info("TaskManager initialised")

    def start_processing(
        self, job_id: str, project_id: str, video_url: str
    ) -> bool:
        logger.info(f"start_processing: job={job_id} project={project_id}")
        thread = threading.Thread(
            target=run_processing_pipeline,
            args=(job_id, project_id, video_url),
            daemon=True,
            name=f"pipeline-{job_id[:20]}",
        )
        with self._lock:
            self._threads[job_id] = thread
        try:
            thread.start()
            logger.info(f"  Thread started: {thread.name} alive={thread.is_alive()}")
            return True
        except Exception as exc:
            logger.error(f"  Thread start failed: {exc}")
            return False

    def is_running(self, job_id: str) -> bool:
        with self._lock:
            t = self._threads.get(job_id)
            return t.is_alive() if t else False

    def cleanup_finished(self) -> int:
        with self._lock:
            done = [jid for jid, t in self._threads.items() if not t.is_alive()]
            for jid in done:
                del self._threads[jid]
            return len(done)

    @property
    def active_count(self) -> int:
        with self._lock:
            return sum(1 for t in self._threads.values() if t.is_alive())


task_manager = TaskManager()
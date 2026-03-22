"""
Health check endpoint.
Reports full system status including all AI service availability.
"""

from fastapi import APIRouter
from config import settings
from core.task_manager import task_manager
from services.video_service import video_service
from services.reframe_service import reframe_service

router = APIRouter()


@router.get("/health")
async def health_check():
    missing = video_service.missing_dependencies

    # ── Transcription ─────────────────────────────────────────
    transcription_available = False
    transcription_backend   = "unavailable"
    try:
        from services.transcription_service import transcription_service
        transcription_available = transcription_service.is_available
        transcription_backend   = transcription_service.backend
    except Exception:
        pass

    # ── Groq ──────────────────────────────────────────────────
    groq_configured = bool(settings.groq_api_key)
    groq_reachable  = False
    if groq_configured:
        try:
            import httpx
            r = httpx.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                timeout=5.0,
            )
            groq_reachable = r.status_code == 200
        except Exception:
            pass

    # ── Ollama ────────────────────────────────────────────────
    ollama_model     = None
    ollama_available = False
    try:
        from services.highlight_service import highlight_service
        # Force fresh check
        highlight_service._ollama_checked = False
        ollama_model     = highlight_service._find_ollama_model()
        ollama_available = ollama_model is not None
    except Exception:
        pass

    # ── Overall processing mode ───────────────────────────────
    if video_service.is_ready:
        if transcription_available and (groq_reachable or ollama_available):
            processing_mode = "full_ai"
            mode_desc       = (
                f"Full AI — Whisper + "
                f"{'Groq' if groq_reachable else 'Ollama'} highlight detection"
            )
        elif transcription_available:
            processing_mode = "whisper_heuristic"
            mode_desc       = "Whisper transcription + heuristic highlight scoring"
        else:
            processing_mode = "time_split"
            mode_desc       = "Time-based clip splitting (no AI — install faster-whisper)"
    else:
        processing_mode = "simulated"
        mode_desc       = "Simulated mode — install FFmpeg and yt-dlp for real clips"

    return {
        "success": True,
        "data": {
            "status":                  "healthy",
            "app":                     settings.app_name,
            "environment":             settings.app_env,
            "activeJobs":              task_manager.active_count,
            "processingMode":          processing_mode,
            "processingModeDescription": mode_desc,
            "dependencies": {
                "allInstalled": video_service.is_ready,
                "missing":      missing,
                "ffmpeg":       "ffmpeg"  not in missing,
                "ffprobe":      "ffprobe" not in missing,
                "ytDlp":        "yt-dlp"  not in missing,
            },
            "aiServices": {
                "transcription": {
                    "available": transcription_available,
                    "backend":   transcription_backend,
                    "model":     settings.whisper_model,
                },
                "groq": {
                    "configured": groq_configured,
                    "reachable":  groq_reachable,
                    "note":       "Get free key at https://console.groq.com" if not groq_configured else "",
                },
                "ollama": {
                    "available": ollama_available,
                    "url":       settings.ollama_url,
                    "model":     ollama_model,
                },
                "smartReframe": {
                    "available": reframe_service.is_available,
                    "engine":    "MediaPipe" if reframe_service.is_available else "unavailable",
                    "fallback":  "center crop",
                },
            },
        },
        "message": "Server is running",
    }
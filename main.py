"""
ClipWise Backend — FastAPI Application Entry Point.
"""

import logging
import shutil
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError

from config import settings
from api.router import api_router
from api.middleware.error_handler import (
    clipwise_error_handler,
    validation_error_handler,
    generic_error_handler,
)
from core.exceptions import ClipWiseError

# ─── Configure Logging ───────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("clipwise")

# Reduce noise from third-party libraries
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("yt_dlp").setLevel(logging.WARNING)
logging.getLogger("mediapipe").setLevel(logging.WARNING)

# ─── Create App ───────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    description="AI-powered video clip generator backend",
    version="0.3.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# ─── CORS ─────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "Content-Type"],
)

# ─── Error Handlers ──────────────────────────────────────────────

app.add_exception_handler(ClipWiseError, clipwise_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
if not settings.debug:
    app.add_exception_handler(Exception, generic_error_handler)

# ─── File Serving ─────────────────────────────────────────────────

@app.get("/storage/clips/{project_id}/{filename}")
async def serve_clip(project_id: str, filename: str):
    file_path = settings.clips_path / project_id / filename
    if not file_path.exists():
        return JSONResponse(status_code=404, content={"error": "Clip not found"})
    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=filename,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    )

@app.get("/storage/thumbnails/{project_id}/{filename}")
async def serve_thumbnail(project_id: str, filename: str):
    file_path = settings.thumbnails_path / project_id / filename
    if not file_path.exists():
        return JSONResponse(status_code=404, content={"error": "Thumbnail not found"})
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",
        filename=filename,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        },
    )

# ─── Mount API ────────────────────────────────────────────────────

app.include_router(api_router)

# ─── Root ─────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"app": settings.app_name, "version": "0.3.0", "status": "running"}

# ─── System Check ────────────────────────────────────────────────

@app.get("/api/system/check")
async def system_check():
    from services.video_service import video_service
    try:
        from services.reframe_service import reframe_service
        reframe_ok = reframe_service.is_available
    except Exception:
        reframe_ok = False

    return {
        "success": True,
        "data": {
            "healthy": video_service.is_ready,
            "missing": video_service.missing_dependencies,
            "mode": "real" if video_service.is_ready else "simulated",
            "smartReframe": reframe_ok,
        },
    }

# ─── Startup ─────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    from services.video_service import video_service

    for p in [settings.clips_path, settings.thumbnails_path, settings.uploads_path, settings.audio_path]:
        p.mkdir(parents=True, exist_ok=True)

    reframe_ok = False
    try:
        from services.reframe_service import reframe_service
        reframe_ok = reframe_service.is_available
    except ImportError:
        pass

    logger.info("=" * 55)
    logger.info(f"  {settings.app_name} Backend v0.3.0")
    logger.info(f"  Environment: {settings.app_env}")
    logger.info(f"  Frontend: {settings.frontend_url}")
    logger.info(f"  Storage: {settings.storage_path}")
    logger.info(f"  Docs: http://localhost:{settings.backend_port}/docs")

    if video_service.is_ready:
        logger.info("  ✓ FFmpeg + yt-dlp: READY")
    else:
        logger.warning(f"  ⚠ Missing: {', '.join(video_service.missing_dependencies)}")
        logger.warning("  ⚠ Mode: SIMULATED")

    if reframe_ok:
        logger.info("  ✓ Smart Reframe: READY (MediaPipe)")
    else:
        logger.info("  ⚠ Smart Reframe: OFF (center crop)")

    logger.info("=" * 55)

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down...")

# ─── Run ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.debug,
        log_level="info",
    )
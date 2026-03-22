"""
Application configuration.
All values can be overridden via environment variables or a .env file.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):

    # ── App ───────────────────────────────────────────────────
    app_name: str = "ClipWise"
    app_env:  str = "development"
    debug:    bool = True

    # ── Server ────────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # ── CORS ──────────────────────────────────────────────────
    frontend_url: str = "http://localhost:3000"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

    # ── AI: Groq (primary LLM — free tier) ───────────────────
    # Get a free key at https://console.groq.com
    # Leave empty to skip Groq and fall back to Ollama / heuristics.
    groq_api_key: str = ""

    # ── AI: Ollama (local LLM — optional) ────────────────────
    ollama_url: str = "http://localhost:11434"

    # ── AI: Whisper (transcription) ───────────────────────────
    # tiny  ~39 MB  — fastest, lowest accuracy
    # base  ~74 MB  — good balance  ← recommended default
    # small ~244 MB — better accuracy, slower on CPU
    whisper_model: str = "base"

    # ── Storage ───────────────────────────────────────────────
    storage_path: str = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "storage"
    )

    # ── Video processing ──────────────────────────────────────
    max_video_duration: int = 3600   # 60 minutes max
    clip_min_duration:  int = 28     # seconds
    clip_max_duration:  int = 42     # seconds
    clip_count:         int = 6      # target clips per video
    video_format:       str = "mp4"
    video_quality:      str = "720"  # max download resolution (height)

    # ── Storage paths (auto-created on first access) ──────────

    @property
    def uploads_path(self) -> Path:
        p = Path(self.storage_path) / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def clips_path(self) -> Path:
        p = Path(self.storage_path) / "clips"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def thumbnails_path(self) -> Path:
        p = Path(self.storage_path) / "thumbnails"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def audio_path(self) -> Path:
        """Temporary WAV files for Whisper transcription."""
        p = Path(self.storage_path) / "audio"
        p.mkdir(parents=True, exist_ok=True)
        return p

    class Config:
        env_file          = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
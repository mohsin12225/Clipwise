"""
Audio extraction service.
Extracts audio from downloaded video files for transcription.
Uses FFmpeg to produce a clean mono WAV file suitable for Whisper.
"""

import subprocess
import os
import logging
from pathlib import Path
from typing import Optional, Callable

from config import settings

logger = logging.getLogger("clipwise.audio")


class AudioServiceError(Exception):
    pass


class AudioService:
    """
    Extracts audio tracks from video files.
    Produces 16kHz mono WAV — the exact format Whisper expects.
    """

    # Whisper works best with 16kHz mono PCM WAV
    SAMPLE_RATE = 16000
    CHANNELS = 1

    def extract_audio(
        self,
        video_path: str,
        project_id: str,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> str:
        """
        Extracts audio from a video file and saves it as a WAV.

        Args:
            video_path:   Absolute path to the source video file.
            project_id:   Used to build the output directory path.
            on_progress:  Optional callback(percent, message).

        Returns:
            Absolute path to the extracted WAV file.

        Raises:
            AudioServiceError: If FFmpeg is unavailable or extraction fails.
        """
        import shutil
        if not shutil.which("ffmpeg"):
            raise AudioServiceError(
                "FFmpeg is not installed. Cannot extract audio."
            )

        if not os.path.exists(video_path):
            raise AudioServiceError(f"Video file not found: {video_path}")

        output_dir = settings.audio_path / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(output_dir / "audio.wav")

        logger.info(f"Extracting audio: {video_path} → {output_path}")

        if on_progress:
            on_progress(0.0, "Extracting audio track...")

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",                          # No video
            "-acodec", "pcm_s16le",         # 16-bit PCM
            "-ar", str(self.SAMPLE_RATE),   # 16 kHz
            "-ac", str(self.CHANNELS),      # Mono
            "-af", "highpass=f=200,lowpass=f=3000,afftdn=nf=-25",  # Light noise reduction
            output_path,
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except subprocess.TimeoutExpired:
            raise AudioServiceError("Audio extraction timed out after 5 minutes.")
        except Exception as e:
            raise AudioServiceError(f"FFmpeg process error: {e}")

        if result.returncode != 0:
            stderr_tail = result.stderr[-500:] if result.stderr else "no stderr"
            raise AudioServiceError(
                f"FFmpeg audio extraction failed (exit {result.returncode}):\n{stderr_tail}"
            )

        if not os.path.exists(output_path):
            raise AudioServiceError("FFmpeg exited cleanly but output WAV not found.")

        file_size = os.path.getsize(output_path)
        if file_size < 1000:
            raise AudioServiceError(
                f"Extracted audio file is suspiciously small ({file_size} bytes). "
                "The video may have no audio track."
            )

        size_mb = file_size / (1024 * 1024)
        logger.info(f"Audio extracted successfully: {size_mb:.1f} MB → {output_path}")

        if on_progress:
            on_progress(100.0, f"Audio extracted ({size_mb:.1f} MB)")

        return output_path

    def get_audio_duration(self, audio_path: str) -> float:
        """
        Returns the duration of an audio file in seconds using ffprobe.
        Returns 0.0 on failure.
        """
        import shutil
        if not shutil.which("ffprobe"):
            return 0.0

        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            audio_path,
        ]
        try:
            import json
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                duration = float(data.get("format", {}).get("duration", 0))
                return duration
        except Exception:
            pass
        return 0.0

    def cleanup(self, project_id: str):
        """Remove extracted audio files for a project."""
        import shutil as _shutil
        audio_dir = settings.audio_path / project_id
        if audio_dir.exists():
            _shutil.rmtree(audio_dir, ignore_errors=True)
            logger.info(f"Cleaned up audio for project: {project_id}")


audio_service = AudioService()

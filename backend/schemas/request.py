"""
Request body schemas (Pydantic models for input validation).
"""

from pydantic import BaseModel, field_validator
import re

# All common YouTube URL patterns
YOUTUBE_PATTERNS = [
    r"^(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/live/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?m\.youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
]


def extract_youtube_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    url = url.strip()
    for pattern in YOUTUBE_PATTERNS:
        match = re.match(pattern, url)
        if match:
            return match.group(1)
    return None


class CreateProjectRequest(BaseModel):
    """Request body for creating a new project."""

    videoUrl: str

    @field_validator("videoUrl")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Video URL is required")

        video_id = extract_youtube_video_id(v)
        if not video_id:
            raise ValueError(
                "Invalid YouTube URL. Supported formats: "
                "youtube.com/watch?v=..., youtu.be/..., "
                "youtube.com/shorts/..., youtube.com/embed/..."
            )
        return v


class StartProcessingRequest(BaseModel):
    """Request body for starting processing."""

    projectId: str
    videoUrl: str

    @field_validator("videoUrl")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Video URL is required")
        return v


class RetryProcessingRequest(BaseModel):
    """Request body for retrying processing (optional body)."""
    pass
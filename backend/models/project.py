"""
Project data model for in-memory storage.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class Project:
    id: str
    video_url: str
    title: str
    thumbnail_url: str
    status: str  # idle, processing, completed, error
    clip_count: int = 0
    duration: float = 0.0
    job_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "videoUrl": self.video_url,
            "title": self.title,
            "thumbnailUrl": self.thumbnail_url,
            "status": self.status,
            "clipCount": self.clip_count,
            "duration": self.duration,
            "jobId": self.job_id,
            "errorMessage": self.error_message,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        }
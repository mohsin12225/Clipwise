"""
Processing job data model for in-memory storage.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class ProcessingJob:
    job_id: str
    project_id: str
    video_url: str
    status: str = "processing"  # processing, completed, failed
    progress: float = 0.0
    stage: str = "queued"  # queued, fetching, transcribing, analyzing, generating, completed, failed
    stage_progress: float = 0.0
    message: str = "Initializing..."
    error: Optional[str] = None
    clips: List[Dict[str, Any]] = field(default_factory=list)
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    estimated_time_remaining: Optional[float] = None

    def to_status_dict(self) -> dict:
        return {
            "jobId": self.job_id,
            "projectId": self.project_id,
            "status": self.status,
            "progress": round(self.progress, 1),
            "stage": self.stage,
            "stageProgress": round(self.stage_progress, 1),
            "message": self.message,
            "error": self.error,
            "clips": self.clips,
            "startedAt": self.started_at,
            "estimatedTimeRemaining": self.estimated_time_remaining,
        }
"""
Response schemas for API endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List


class CreateProjectResponseData(BaseModel):
    """Data returned when creating a project."""

    projectId: str
    jobId: str


class StartProcessingResponseData(BaseModel):
    """Data returned when starting processing."""

    jobId: str
    projectId: str
    status: str


class CaptionSegment(BaseModel):
    """A single caption segment."""

    id: str
    text: str
    startTime: float
    endTime: float


class ClipResponseData(BaseModel):
    """A single clip returned from processing."""

    id: str
    projectId: str
    title: str
    subtitle: str
    transcript: str
    startTime: float
    endTime: float
    duration: float
    thumbnailUrl: str
    reason: str
    score: float
    order: int
    captions: List[CaptionSegment] = []


class ProcessingStatusResponseData(BaseModel):
    """Processing status response."""

    jobId: str
    projectId: str
    status: str  # "processing" | "completed" | "failed"
    progress: float
    stage: str
    stageProgress: float
    message: str
    error: Optional[str] = None
    clips: List[ClipResponseData] = []
    startedAt: str
    estimatedTimeRemaining: Optional[float] = None


class ProjectResponseData(BaseModel):
    """Project data for API responses."""

    id: str
    videoUrl: str
    title: str
    thumbnailUrl: str
    status: str
    clipCount: int
    duration: float
    jobId: Optional[str] = None
    errorMessage: Optional[str] = None
    createdAt: str
    updatedAt: str
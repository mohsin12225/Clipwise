"""
Shared schema components used across request and response models.
"""

from pydantic import BaseModel
from typing import TypeVar, Generic, Optional, List

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""

    success: bool
    data: T
    message: Optional[str] = None
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response body."""

    success: bool = False
    data: None = None
    message: Optional[str] = None
    error: str
    code: str = "UNKNOWN_ERROR"
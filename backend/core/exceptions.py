"""
Custom exception classes for structured error handling.
"""


class ClipWiseError(Exception):
    """Base exception for all ClipWise errors."""

    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class ProcessingError(ClipWiseError):
    """Raised when video processing fails."""

    def __init__(self, message: str, code: str = "PROCESSING_ERROR"):
        super().__init__(message, code)


class JobNotFoundError(ClipWiseError):
    """Raised when a processing job is not found."""

    def __init__(self, job_id: str):
        super().__init__(
            message=f"Processing job '{job_id}' not found",
            code="JOB_NOT_FOUND",
        )


class ProjectNotFoundError(ClipWiseError):
    """Raised when a project is not found."""

    def __init__(self, project_id: str):
        super().__init__(
            message=f"Project '{project_id}' not found",
            code="PROJECT_NOT_FOUND",
        )


class ValidationError(ClipWiseError):
    """Raised when input validation fails."""

    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR")
"""
Global error handling middleware.
Catches exceptions and returns structured error responses.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError

from core.exceptions import (
    ClipWiseError,
    JobNotFoundError,
    ProjectNotFoundError,
    ValidationError,
)


async def clipwise_error_handler(request: Request, exc: ClipWiseError):
    """Handle custom ClipWise exceptions."""
    status_code = 500
    if isinstance(exc, (JobNotFoundError, ProjectNotFoundError)):
        status_code = 404
    elif isinstance(exc, ValidationError):
        status_code = 422

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": exc.message,
            "code": exc.code,
        },
    )


async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic/FastAPI validation errors."""
    errors = exc.errors()
    first_error = errors[0] if errors else {"msg": "Validation error"}

    # Build a readable error message
    field = " → ".join(str(loc) for loc in first_error.get("loc", []) if loc != "body")
    message = first_error.get("msg", "Invalid input")
    detail = f"{field}: {message}" if field else message

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": detail,
            "code": "VALIDATION_ERROR",
        },
    )


async def generic_error_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": "An internal server error occurred",
            "code": "INTERNAL_ERROR",
        },
    )
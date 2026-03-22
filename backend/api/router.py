"""
Main API router that mounts all sub-routers.
"""

from fastapi import APIRouter
from api.routes import health, projects, process

api_router = APIRouter(prefix="/api")

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(projects.router, tags=["Projects"])
api_router.include_router(process.router, tags=["Processing"])
"""
Project CRUD endpoints.
"""

import logging
import uuid
import re
from fastapi import APIRouter, HTTPException

from schemas.request import CreateProjectRequest
from models.project import Project
from models.processing import ProcessingJob
from services.storage_service import storage
from core.task_manager import task_manager

logger = logging.getLogger("clipwise.api.projects")

router = APIRouter()

YOUTUBE_PATTERNS = [
    r"^(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?(?:www\.)?youtube\.com/live/([a-zA-Z0-9_-]{11})",
    r"^(?:https?://)?m\.youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
]


def extract_video_id(url: str) -> str | None:
    for pattern in YOUTUBE_PATTERNS:
        match = re.match(pattern, url.strip())
        if match:
            return match.group(1)
    return None


@router.post("/projects")
async def create_project(request: CreateProjectRequest):
    """
    Creates a new project and IMMEDIATELY starts processing.
    """
    video_url = request.videoUrl.strip()
    video_id = extract_video_id(video_url)

    project_id = f"proj_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg" if video_id else ""

    logger.info(f"Creating project: id={project_id}, job={job_id}, url={video_url}")

    # 1. Create project in storage
    project = Project(
        id=project_id,
        video_url=video_url,
        title=f"YouTube Video ({video_id})" if video_id else "New Project",
        thumbnail_url=thumbnail_url,
        status="processing",
        job_id=job_id,
    )
    storage.create_project(project)
    logger.info(f"  Project stored: {project_id}")

    # 2. Create processing job in storage
    job = ProcessingJob(
        job_id=job_id,
        project_id=project_id,
        video_url=video_url,
    )
    storage.create_job(job)
    logger.info(f"  Job stored: {job_id}")

    # 3. Start background processing — THIS IS THE CRITICAL PART
    started = task_manager.start_processing(job_id, project_id, video_url)

    if not started:
        logger.error(f"  FAILED to start processing thread!")
        storage.update_project(project_id, status="error",
                               error_message="Failed to start processing thread")
        storage.update_job(job_id, status="failed", error="Thread start failed")

    logger.info(f"  Processing started: {started}")
    logger.info(f"  Active threads: {task_manager.active_count}")

    return {
        "success": True,
        "data": {
            "projectId": project_id,
            "jobId": job_id,
        },
        "message": "Project created and processing started",
    }


@router.get("/projects")
async def list_projects():
    projects = storage.get_all_projects()
    logger.debug(f"Listing {len(projects)} projects")
    return {
        "success": True,
        "data": [p.to_dict() for p in projects],
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Project '{project_id}' not found",
        })
    return {"success": True, "data": project.to_dict()}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Project '{project_id}' not found",
        })

    try:
        from services.video_service import video_service
        from services.clip_service import clip_service
        video_service.cleanup_project_files(project_id)
        clip_service.delete_project_clips(project_id)
    except Exception as e:
        logger.warning(f"Cleanup error for {project_id}: {e}")

    storage.delete_jobs_for_project(project_id)
    storage.delete_project(project_id)
    logger.info(f"Deleted project: {project_id}")

    return {"success": True, "data": None, "message": "Project deleted"}


@router.get("/projects/{project_id}/status")
async def get_project_status(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Project '{project_id}' not found",
        })

    job = storage.get_job_by_project(project_id)
    if not job:
        return {
            "success": True,
            "data": {
                "jobId": None, "projectId": project_id,
                "status": project.status,
                "progress": 100.0 if project.status == "completed" else 0.0,
                "stage": project.status, "stageProgress": 0.0,
                "message": f"Status: {project.status}",
                "error": project.error_message, "clips": [],
                "startedAt": project.created_at, "estimatedTimeRemaining": None,
            },
        }

    return {"success": True, "data": job.to_status_dict()}
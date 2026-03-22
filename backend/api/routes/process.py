"""
Processing endpoints — start, status, retry.
"""

import logging
import uuid
from fastapi import APIRouter, HTTPException

from schemas.request import StartProcessingRequest
from models.processing import ProcessingJob
from services.storage_service import storage
from core.task_manager import task_manager

logger = logging.getLogger("clipwise.api.process")

router = APIRouter()


@router.post("/process")
async def start_processing(request: StartProcessingRequest):
    project_id = request.projectId
    video_url = request.videoUrl.strip()

    logger.info(f"POST /process: project={project_id}")

    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Project '{project_id}' not found",
        })

    existing_job = storage.get_job_by_project(project_id)
    if existing_job and existing_job.status == "processing":
        logger.info(f"  Already processing: job={existing_job.job_id}")
        return {
            "success": True,
            "data": {
                "jobId": existing_job.job_id,
                "projectId": project_id,
                "status": "processing",
            },
            "message": "Already processing",
        }

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job = ProcessingJob(job_id=job_id, project_id=project_id, video_url=video_url)
    storage.create_job(job)
    storage.update_project(project_id, status="processing", job_id=job_id, error_message=None)

    started = task_manager.start_processing(job_id, project_id, video_url)
    logger.info(f"  Started processing: job={job_id}, thread_started={started}")

    return {
        "success": True,
        "data": {"jobId": job_id, "projectId": project_id, "status": "processing"},
        "message": "Processing started",
    }


@router.get("/status/{job_id}")
async def get_processing_status(job_id: str):
    job = storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Job '{job_id}' not found",
        })

    logger.debug(f"GET /status/{job_id}: stage={job.stage} progress={job.progress:.1f}%")

    return {"success": True, "data": job.to_status_dict()}


@router.post("/process/{project_id}/retry")
async def retry_processing(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail={
            "success": False, "error": f"Project '{project_id}' not found",
        })

    logger.info(f"Retrying processing for project={project_id}")

    storage.delete_jobs_for_project(project_id)

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job = ProcessingJob(job_id=job_id, project_id=project_id, video_url=project.video_url)
    storage.create_job(job)
    storage.update_project(project_id, status="processing", job_id=job_id, error_message=None)

    started = task_manager.start_processing(job_id, project_id, project.video_url)
    logger.info(f"  Retry started: job={job_id}, thread_started={started}")

    return {
        "success": True,
        "data": {"jobId": job_id, "projectId": project_id, "status": "processing"},
        "message": "Processing restarted",
    }
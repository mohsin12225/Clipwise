"""
In-memory storage service with logging.
"""

import logging
import threading
from typing import Dict, Optional, List
from datetime import datetime

from models.project import Project
from models.processing import ProcessingJob

logger = logging.getLogger("clipwise.storage")


class StorageService:
    def __init__(self):
        self._projects: Dict[str, Project] = {}
        self._jobs: Dict[str, ProcessingJob] = {}
        self._project_lock = threading.Lock()
        self._job_lock = threading.Lock()
        logger.info("StorageService initialized")

    # ─── Projects ──────────────────────────────────────────────

    def create_project(self, project: Project) -> Project:
        with self._project_lock:
            self._projects[project.id] = project
            logger.debug(f"Created project: {project.id}")
            return project

    def get_project(self, project_id: str) -> Optional[Project]:
        with self._project_lock:
            return self._projects.get(project_id)

    def get_all_projects(self) -> List[Project]:
        with self._project_lock:
            projects = list(self._projects.values())
            projects.sort(key=lambda p: p.created_at, reverse=True)
            return projects

    def update_project(self, project_id: str, **kwargs) -> Optional[Project]:
        with self._project_lock:
            project = self._projects.get(project_id)
            if not project:
                logger.warning(f"update_project: {project_id} not found")
                return None
            for key, value in kwargs.items():
                if hasattr(project, key):
                    setattr(project, key, value)
            project.updated_at = datetime.utcnow().isoformat()
            return project

    def delete_project(self, project_id: str) -> bool:
        with self._project_lock:
            if project_id in self._projects:
                del self._projects[project_id]
                return True
            return False

    # ─── Jobs ──────────────────────────────────────────────────

    def create_job(self, job: ProcessingJob) -> ProcessingJob:
        with self._job_lock:
            self._jobs[job.job_id] = job
            logger.debug(f"Created job: {job.job_id} for project {job.project_id}")
            return job

    def get_job(self, job_id: str) -> Optional[ProcessingJob]:
        with self._job_lock:
            return self._jobs.get(job_id)

    def update_job(self, job_id: str, **kwargs) -> Optional[ProcessingJob]:
        with self._job_lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            return job

    def get_job_by_project(self, project_id: str) -> Optional[ProcessingJob]:
        with self._job_lock:
            for job in self._jobs.values():
                if job.project_id == project_id:
                    return job
            return None

    def delete_job(self, job_id: str) -> bool:
        with self._job_lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                return True
            return False

    def delete_jobs_for_project(self, project_id: str) -> int:
        with self._job_lock:
            to_delete = [jid for jid, j in self._jobs.items() if j.project_id == project_id]
            for jid in to_delete:
                del self._jobs[jid]
            return len(to_delete)


storage = StorageService()
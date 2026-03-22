'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useProcessingStore } from '@/store/useProcessingStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useClipStore } from '@/store/useClipStore';
import { useUIStore } from '@/store/useUIStore';
import { getProcessingStatusAPI, ApiError } from '@/lib/api';
import type { Project } from '@/types';

const POLL_INTERVAL = 3000;

interface Props {
  projects: Project[];
}

/**
 * Invisible component that polls status for all active projects
 * on the dashboard, keeping project cards updated.
 */
export function ActiveProcessingTracker({ projects }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const { startTracking, updateFromServer, isTracking } = useProcessingStore();
  const { updateProjectStatus } = useProjectStore();
  const { setClipsForProject } = useClipStore();
  const addToast = useUIStore((s) => s.addToast);

  const pollAll = useCallback(async () => {
    if (!mountedRef.current) return;

    const active = projects.filter((p) => p.status === 'processing' && p.jobId);
    if (active.length === 0) return;

    await Promise.allSettled(
      active.map(async (project) => {
        if (!project.jobId) return;

        if (!isTracking(project.id)) {
          startTracking(project.id, project.jobId);
        }

        try {
          const response = await getProcessingStatusAPI(project.jobId);
          if (!mountedRef.current || !response.success || !response.data) return;

          const data = response.data;
          updateFromServer(project.id, data);

          if (data.status === 'completed') {
            updateProjectStatus(project.id, 'completed', {
              clipCount: data.clips?.length || 0,
            });
            if (data.clips?.length) {
              setClipsForProject(project.id, data.clips);
            }
            addToast(`"${project.title}" — ${data.clips?.length || 0} clips ready!`, 'success');
          } else if (data.status === 'failed') {
            updateProjectStatus(project.id, 'error', {
              errorMessage: data.error || 'Failed',
            });
          }
        } catch (error) {
          // Silent on dashboard
        }
      })
    );

    // Schedule next poll if there are still active projects
    if (mountedRef.current) {
      const stillActive = projects.filter((p) => p.status === 'processing' && p.jobId);
      if (stillActive.length > 0) {
        timerRef.current = setTimeout(pollAll, POLL_INTERVAL);
      }
    }
  }, [projects, isTracking, startTracking, updateFromServer, updateProjectStatus, setClipsForProject, addToast]);

  useEffect(() => {
    mountedRef.current = true;

    const active = projects.filter((p) => p.status === 'processing' && p.jobId);
    if (active.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    pollAll();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [projects.length, pollAll]);

  return null;
}
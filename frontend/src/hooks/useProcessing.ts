'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useProcessingStore } from '@/store/useProcessingStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useClipStore } from '@/store/useClipStore';
import { getProcessingStatusAPI, ApiError } from '@/lib/api';
import type { ProcessingStage, ProcessingStep, ClipData } from '@/types';

const POLL_INTERVAL = 2000;
const MAX_ERRORS = 5;

interface UseProcessingOptions {
  projectId: string;
  jobId: string | null;
  enabled?: boolean;
  onComplete?: (projectId: string) => void;
  onError?: (projectId: string, error: string) => void;
}

interface UseProcessingReturn {
  status: 'processing' | 'completed' | 'failed' | null;
  progress: number;
  stage: ProcessingStage | null;
  stageProgress: number;
  message: string;
  error: string | null;
  steps: ProcessingStep[];
  clips: ClipData[];
  estimatedTimeRemaining: number | null;
  isPolling: boolean;
}

export function useProcessing({
  projectId,
  jobId,
  enabled = true,
  onComplete,
  onError,
}: UseProcessingOptions): UseProcessingReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorCountRef = useRef(0);
  const mountedRef = useRef(true);
  const pollingRef = useRef(false);
  const jobIdRef = useRef(jobId);

  // Store refs for callbacks to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  // Keep jobId ref current
  jobIdRef.current = jobId;

  const updateFromServer = useProcessingStore((s) => s.updateFromServer);
  const startTracking = useProcessingStore((s) => s.startTracking);
  const setStoreError = useProcessingStore((s) => s.setError);
  const processingState = useProcessingStore((s) => s.statuses.get(projectId));

  const updateProjectStatus = useProjectStore((s) => s.updateProjectStatus);
  const setClipsForProject = useClipStore((s) => s.setClipsForProject);

  // Stop polling — uses only refs, no state setters
  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pollingRef.current = false;
  }, []);

  // Single poll iteration
  const poll = useCallback(async () => {
    const currentJobId = jobIdRef.current;
    if (!currentJobId || !mountedRef.current || !pollingRef.current) {
      return;
    }

    try {
      const response = await getProcessingStatusAPI(currentJobId);

      if (!mountedRef.current || !pollingRef.current) return;

      if (response.success && response.data) {
        const data = response.data;
        errorCountRef.current = 0;

        updateFromServer(projectId, data);

        if (data.status === 'completed') {
          updateProjectStatus(projectId, 'completed', {
            clipCount: data.clips?.length || 0,
          });
          if (data.clips && data.clips.length > 0) {
            setClipsForProject(projectId, data.clips);
          }
          stopPolling();
          onCompleteRef.current?.(projectId);
          return;
        }

        if (data.status === 'failed') {
          updateProjectStatus(projectId, 'error', {
            errorMessage: data.error || 'Processing failed',
          });
          stopPolling();
          onErrorRef.current?.(projectId, data.error || 'Processing failed');
          return;
        }

        // Still processing — schedule next poll
        if (mountedRef.current && pollingRef.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      }
    } catch (error) {
      if (!mountedRef.current || !pollingRef.current) return;

      errorCountRef.current += 1;

      if (errorCountRef.current >= MAX_ERRORS) {
        const msg =
          error instanceof ApiError && error.isNetworkError
            ? 'Lost connection to server.'
            : error instanceof Error
              ? error.message
              : 'Polling failed';

        setStoreError(projectId, msg);
        updateProjectStatus(projectId, 'error', { errorMessage: msg });
        stopPolling();
        onErrorRef.current?.(projectId, msg);
        return;
      }

      // Retry with backoff
      if (mountedRef.current && pollingRef.current) {
        const delay = POLL_INTERVAL * Math.min(errorCountRef.current + 1, 3);
        timerRef.current = setTimeout(poll, delay);
      }
    }
  }, [
    projectId,
    updateFromServer,
    setStoreError,
    updateProjectStatus,
    setClipsForProject,
    stopPolling,
  ]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingRef.current || !jobIdRef.current) return;

    pollingRef.current = true;
    errorCountRef.current = 0;

    startTracking(projectId, jobIdRef.current);

    // First poll immediately
    poll();
  }, [projectId, poll, startTracking]);

  // Auto-start/stop based on enabled + jobId
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && jobId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [enabled, jobId, startPolling, stopPolling]);

  return {
    status: processingState?.status || null,
    progress: processingState?.progress || 0,
    stage: (processingState?.stage as ProcessingStage) || null,
    stageProgress: processingState?.stageProgress || 0,
    message: processingState?.message || '',
    error: processingState?.error || null,
    steps: processingState?.steps || [],
    clips: processingState?.clips || [],
    estimatedTimeRemaining: processingState?.estimatedTimeRemaining || null,
    isPolling: pollingRef.current,
  };
}
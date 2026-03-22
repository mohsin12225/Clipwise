'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { ProcessingStatusBar } from '@/components/processing/ProcessingStatus';
import { ProcessingTimeline } from '@/components/processing/ProcessingTimeline';
import { ProcessingError } from '@/components/processing/ProcessingError';
import { VideoPreview } from '@/components/processing/VideoPreview';
import { ClipList } from '@/components/clips/ClipList';
import { ClipPreviewModal } from '@/components/clips/ClipPreviewModal';
import { useProjectStore } from '@/store/useProjectStore';
import { useClipStore } from '@/store/useClipStore';
import { useUIStore } from '@/store/useUIStore';
import { useProcessing } from '@/hooks/useProcessing';
import { retryProcessingAPI, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type ViewLayout = 'grid' | 'list';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Get project from store
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId)
  );
  const updateProject = useProjectStore((s) => s.updateProject);
  const addToast = useUIStore((s) => s.addToast);

  // Clips
  const clips = useClipStore((s) => s.getClipsForProject(projectId));
  const selectedClipId = useClipStore((s) => s.selectedClipId);
  const previewClipId = useClipStore((s) => s.previewClipId);
  const selectClip = useClipStore((s) => s.selectClip);
  const openPreview = useClipStore((s) => s.openPreview);
  const closePreview = useClipStore((s) => s.closePreview);

  const [isRetrying, setIsRetrying] = useState(false);
  const [clipLayout, setClipLayout] = useState<ViewLayout>('grid');

  // Determine if polling should be active
  const shouldPoll = useMemo(() => {
    if (!project) return false;
    return project.status === 'processing' && !!project.jobId;
  }, [project?.status, project?.jobId]);

  // Start polling — this is the KEY connection
  const {
    status: processingStatus,
    progress,
    message,
    error: processingError,
    steps,
    estimatedTimeRemaining,
    isPolling,
  } = useProcessing({
    projectId,
    jobId: project?.jobId || null,
    enabled: shouldPoll,
    onComplete: () => {
      addToast('Processing complete! Your clips are ready.', 'success');
    },
    onError: (_pid, err) => {
      addToast(`Processing failed: ${err}`, 'error');
    },
  });

  // Retry handler
  const handleRetry = useCallback(async () => {
    if (!project) return;
    setIsRetrying(true);
    try {
      const response = await retryProcessingAPI(projectId);
      if (response.success && response.data) {
        updateProject(projectId, {
          jobId: response.data.jobId,
          status: 'processing',
          errorMessage: null,
        });
        addToast('Retrying processing...', 'info');
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Failed to retry',
        'error'
      );
    } finally {
      setIsRetrying(false);
    }
  }, [project, projectId, updateProject, addToast]);

  const handleOpenEditor = useCallback(() => {
    router.push(`/editor/${projectId}`);
  }, [router, projectId]);

  // Preview clip
  const previewClip = previewClipId
    ? clips.find((c) => c.id === previewClipId) || null
    : null;

  // Not found
  if (!project) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto">
          <Card padding="lg">
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Project not found.
              </p>
              <div className="mt-4">
                <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  const isProcessing = project.status === 'processing';
  const isCompleted = project.status === 'completed';
  const isError = project.status === 'error';
  const isIdle = project.status === 'idle';
  const hasClips = clips.length > 0;

  // Use processing store message if available, otherwise derive from project
  const displayProgress = isProcessing ? progress : (isCompleted ? 100 : 0);
  const displayMessage = isProcessing
    ? (message || 'Processing your video...')
    : isCompleted
      ? 'Processing complete!'
      : '';

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className={cn(
            'inline-flex items-center gap-1.5',
            'text-sm text-gray-500 dark:text-gray-400',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'transition-colors duration-200 mb-6'
          )}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {project.title}
              </h1>
              <Badge
                variant={
                  isProcessing ? 'info' : isCompleted ? 'success' : isError ? 'error' : 'neutral'
                }
                dot
              >
                {isProcessing ? 'Processing' : isCompleted ? 'Completed' : isError ? 'Failed' : 'Idle'}
              </Badge>
              {isPolling && (
                <span className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate max-w-lg">
              {project.videoUrl}
            </p>
          </div>

          {isCompleted && (
            <Button
              onClick={handleOpenEditor}
              icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
              className="shrink-0"
            >
              Open Editor
            </Button>
          )}
        </motion.div>

        {/* Video Preview */}
        {(isProcessing || isIdle || isError || !hasClips) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
            <VideoPreview videoUrl={project.videoUrl} />
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Progress bar */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card padding="md">
                <ProcessingStatusBar
                  progress={displayProgress}
                  message={displayMessage}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                />
              </Card>
            </motion.div>
          )}

          {/* Steps timeline */}
          {(isProcessing || isError) && steps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card padding="md">
                <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">
                  Processing Steps
                </h3>
                <ProcessingTimeline steps={steps} />
              </Card>
            </motion.div>
          )}

          {/* Error */}
          {isError && (
            <ProcessingError
              error={project.errorMessage || processingError || 'An error occurred'}
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          )}

          {/* Idle */}
          {isIdle && (
            <Card padding="md">
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Processing hasn&apos;t started. The backend may not be running.
                </p>
                <Button variant="primary" onClick={handleRetry} loading={isRetrying}>
                  Start Processing
                </Button>
              </div>
            </Card>
          )}

          {/* Clips */}
          {(isCompleted || hasClips) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generated Clips
                </h2>
                <Tabs
                  tabs={[
                    { id: 'grid', label: '', icon: <Squares2X2Icon className="w-4 h-4" /> },
                    { id: 'list', label: '', icon: <ListBulletIcon className="w-4 h-4" /> },
                  ]}
                  activeTab={clipLayout}
                  onChange={(id) => setClipLayout(id as ViewLayout)}
                />
              </div>

              <ClipList
                clips={clips}
                videoUrl={project.videoUrl}
                selectedClipId={selectedClipId}
                onSelectClip={selectClip}
                onPreviewClip={openPreview}
                layout={clipLayout}
              />

              {hasClips && (
                <Card padding="md">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Ready to edit?
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Open the editor to trim, reorder, and add captions.
                      </p>
                    </div>
                    <Button onClick={handleOpenEditor} icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}>
                      Open Editor
                    </Button>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <ClipPreviewModal
        clip={previewClip}
        videoUrl={project.videoUrl}
        isOpen={previewClipId !== null}
        onClose={closePreview}
      />
    </PageWrapper>
  );
}
'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrashIcon,
  EllipsisHorizontalIcon,
  FilmIcon,
  ClockIcon,
  CheckCircleIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
} from '@/lib/validators';
import { useProcessingStore } from '@/store/useProcessingStore';
import { useClipStore } from '@/store/useClipStore';
import type { Project, ProjectStatus } from '@/types';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
}

const statusConfig: Record<
  ProjectStatus,
  {
    label: string;
    variant: 'info' | 'warning' | 'success' | 'error' | 'neutral';
    dot: boolean;
  }
> = {
  idle: { label: 'Idle', variant: 'neutral', dot: true },
  processing: { label: 'Processing', variant: 'info', dot: true },
  completed: { label: 'Ready', variant: 'success', dot: true },
  error: { label: 'Failed', variant: 'error', dot: true },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  const videoId = extractYoutubeVideoId(project.videoUrl);
  const thumbnailUrl =
    !imageError && videoId ? getYoutubeThumbnailUrl(videoId, 'hq') : null;

  const statusInfo = statusConfig[project.status];

  // Processing progress
  const processingState = useProcessingStore((s) =>
    s.statuses.get(project.id)
  );
  const processingProgress = processingState?.progress || 0;
  const processingStage = processingState?.stage;

  // Clip count from clip store (real data)
  const clipCount = useClipStore((s) => s.getClipCount(project.id));
  const displayClipCount = clipCount || project.clipCount || 0;

  const isProcessing = project.status === 'processing';
  const isCompleted = project.status === 'completed';

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowMenu(false);
      onDelete(project.id);
    },
    [project.id, onDelete]
  );

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  }, []);

  const projectLink =
    project.status === 'completed'
      ? `/project/${project.id}`
      : `/project/${project.id}`;

  const stageLabels: Record<string, string> = {
    queued: 'Queued',
    fetching: 'Fetching',
    transcribing: 'Transcribing',
    analyzing: 'Analyzing',
    generating: 'Generating',
  };

  return (
    <Link href={projectLink} className="block group">
      <div
        className={cn(
          'relative',
          'rounded-2xl overflow-hidden',
          'bg-white dark:bg-surface-dark-secondary',
          'border border-border-light dark:border-border-dark',
          'shadow-soft-sm dark:shadow-none',
          'transition-all duration-200',
          'hover:shadow-soft-md hover:border-border-light-secondary hover:-translate-y-0.5',
          'dark:hover:border-border-dark-secondary',
          'active:translate-y-0 active:shadow-soft-sm'
        )}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-100 dark:bg-surface-dark-tertiary overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={project.title}
              className={cn(
                'w-full h-full object-cover',
                'transition-transform duration-300',
                'group-hover:scale-105'
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 dark:bg-surface-dark/90 backdrop-blur-sm">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {processingStage
                    ? stageLabels[processingStage] || 'Processing'
                    : 'Processing'}
                  ...
                </span>
                {processingProgress > 0 && (
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                    {Math.round(processingProgress)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Completed overlay badge */}
          {isCompleted && displayClipCount > 0 && (
            <div className="absolute bottom-2 left-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
                  'bg-white/90 dark:bg-surface-dark/90',
                  'backdrop-blur-sm'
                )}
              >
                <ScissorsIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {displayClipCount} clip{displayClipCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2.5 left-2.5">
            <Badge variant={statusInfo.variant} dot={statusInfo.dot}>
              {statusInfo.label}
            </Badge>
          </div>

          {/* Menu button */}
          <div className="absolute top-2.5 right-2.5">
            <button
              onClick={toggleMenu}
              className={cn(
                'p-1.5 rounded-lg',
                'bg-white/80 dark:bg-surface-dark/80',
                'backdrop-blur-sm',
                'text-gray-600 dark:text-gray-300',
                'hover:bg-white dark:hover:bg-surface-dark',
                'transition-all duration-150',
                'opacity-0 group-hover:opacity-100',
                showMenu && 'opacity-100'
              )}
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div
                  className={cn(
                    'absolute right-0 top-full mt-1 z-20',
                    'w-36',
                    'rounded-xl overflow-hidden',
                    'bg-white dark:bg-surface-dark-secondary',
                    'border border-border-light dark:border-border-dark',
                    'shadow-soft-lg dark:shadow-none',
                    'animate-scale-in'
                  )}
                >
                  <button
                    onClick={handleDelete}
                    className={cn(
                      'w-full flex items-center gap-2',
                      'px-3 py-2.5',
                      'text-sm text-red-600 dark:text-red-400',
                      'hover:bg-red-50 dark:hover:bg-red-950/30',
                      'transition-colors duration-150'
                    )}
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className={cn(
              'text-sm font-semibold',
              'text-gray-900 dark:text-white',
              'truncate'
            )}
          >
            {project.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
            {project.videoUrl}
          </p>

          {/* Processing progress bar */}
          {isProcessing && processingProgress > 0 && (
            <div className="mt-2.5">
              <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-brand-500 dark:bg-brand-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Completed: View Clips button */}
          {isCompleted && displayClipCount > 0 && (
            <div className="mt-3">
              <div
                className={cn(
                  'flex items-center gap-2 py-1.5 px-2.5 rounded-lg',
                  'bg-green-50 dark:bg-green-950/30',
                  'border border-green-200 dark:border-green-800/50'
                )}
              >
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                  {displayClipCount} clip{displayClipCount !== 1 ? 's' : ''}{' '}
                  ready
                </span>
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <ClockIcon className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(project.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  ClockIcon,
  SparklesIcon,
  FilmIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { formatDuration, formatTimeRange } from '@/lib/formatTime';
import { formatFileSize } from '@/lib/utils';
import { resolveStorageUrl } from '@/lib/constants';
import type { ClipData } from '@/types';

interface ClipItemProps {
  clip: ClipData;
  videoUrl: string;
  isSelected: boolean;
  onSelect: (clipId: string) => void;
  onPreview: (clipId: string) => void;
  layout?: 'grid' | 'list';
}

export function ClipItem({
  clip,
  videoUrl,
  isSelected,
  onSelect,
  onPreview,
  layout = 'grid',
}: ClipItemProps) {
  const [imageError, setImageError] = useState(false);

  const thumbnailUrl = useMemo(() => {
    if (clip.thumbnailUrl && !imageError) {
      return resolveStorageUrl(clip.thumbnailUrl);
    }
    return null;
  }, [clip.thumbnailUrl, imageError]);

  const scorePercent = Math.round((clip.score || 0) * 100);
  const clipVideoSrc = clip.videoUrl ? resolveStorageUrl(clip.videoUrl) : null;

  const handleClick = () => onSelect(clip.id);
  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPreview(clip.id);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clipVideoSrc) return;
    const link = document.createElement('a');
    link.href = clipVideoSrc;
    link.download = `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (layout === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={cn(
          'group flex gap-3 p-3 rounded-xl cursor-pointer',
          'transition-all duration-200',
          'border',
          isSelected
            ? [
                'bg-brand-50 border-brand-200',
                'dark:bg-brand-950/30 dark:border-brand-800/50',
              ]
            : [
                'bg-white border-border-light hover:border-border-light-secondary hover:shadow-soft-sm',
                'dark:bg-surface-dark-secondary dark:border-border-dark dark:hover:border-border-dark-secondary',
              ]
        )}
      >
        {/* Thumbnail */}
        <div
          className={cn(
            'relative w-28 shrink-0 rounded-lg overflow-hidden',
            'bg-gray-100 dark:bg-surface-dark-tertiary',
            'aspect-video'
          )}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={clip.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          <button
            onClick={handlePreview}
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/0 group-hover:bg-black/30',
              'transition-colors duration-200'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full',
                'bg-white/90 dark:bg-white/80',
                'flex items-center justify-center',
                'opacity-0 group-hover:opacity-100',
                'scale-75 group-hover:scale-100',
                'transition-all duration-200',
                'shadow-soft-sm'
              )}
            >
              <PlayIcon className="w-3.5 h-3.5 text-gray-900 ml-0.5" />
            </div>
          </button>

          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-medium text-white tabular-nums">
            {formatDuration(clip.duration)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <h4
            className={cn(
              'text-sm font-semibold truncate',
              'text-gray-900 dark:text-white'
            )}
          >
            {clip.title}
          </h4>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {clip.subtitle || clip.transcript}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <ClockIcon className="w-3 h-3" />
              {formatTimeRange(clip.startTime, clip.endTime)}
            </span>
            {scorePercent > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <SparklesIcon className="w-3 h-3" />
                {scorePercent}%
              </span>
            )}
            {clip.fileSize && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatFileSize(clip.fileSize)}
              </span>
            )}
          </div>
        </div>

        {/* Download button */}
        {clipVideoSrc && (
          <button
            onClick={handleDownload}
            className={cn(
              'self-center p-2 rounded-lg shrink-0',
              'text-gray-400 hover:text-gray-600',
              'dark:text-gray-500 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary',
              'opacity-0 group-hover:opacity-100',
              'transition-all duration-200'
            )}
            title="Download clip"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    );
  }

  // Grid layout
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={handleClick}
      className={cn(
        'group rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-200',
        'border',
        isSelected
          ? [
              'bg-brand-50 border-brand-200 shadow-soft-sm',
              'dark:bg-brand-950/30 dark:border-brand-800/50',
            ]
          : [
              'bg-white border-border-light hover:border-border-light-secondary hover:shadow-soft-md hover:-translate-y-0.5',
              'dark:bg-surface-dark-secondary dark:border-border-dark dark:hover:border-border-dark-secondary',
              'active:translate-y-0 active:shadow-soft-sm',
            ]
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'relative aspect-video',
          'bg-gray-100 dark:bg-surface-dark-tertiary',
          'overflow-hidden'
        )}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={clip.title}
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

        {/* Play overlay */}
        <button
          onClick={handlePreview}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/0 group-hover:bg-black/25',
            'transition-colors duration-200'
          )}
        >
          <div
            className={cn(
              'w-11 h-11 rounded-full',
              'bg-white/90 dark:bg-white/80',
              'flex items-center justify-center',
              'opacity-0 group-hover:opacity-100',
              'scale-75 group-hover:scale-100',
              'transition-all duration-200',
              'shadow-soft-md'
            )}
          >
            <PlayIcon className="w-5 h-5 text-gray-900 ml-0.5" />
          </div>
        </button>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-xs font-medium text-white tabular-nums">
          {formatDuration(clip.duration)}
        </div>

        {/* Score badge */}
        {scorePercent > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 dark:bg-amber-600/90">
            <SparklesIcon className="w-3 h-3 text-white" />
            <span className="text-xs font-semibold text-white">{scorePercent}%</span>
          </div>
        )}

        {/* Download button */}
        {clipVideoSrc && (
          <button
            onClick={handleDownload}
            className={cn(
              'absolute top-2 right-2 p-1.5 rounded-lg',
              'bg-white/80 dark:bg-surface-dark/80',
              'backdrop-blur-sm',
              'text-gray-600 dark:text-gray-300',
              'hover:bg-white dark:hover:bg-surface-dark',
              'opacity-0 group-hover:opacity-100',
              'transition-all duration-200'
            )}
            title="Download clip"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h4
          className={cn(
            'text-sm font-semibold',
            'text-gray-900 dark:text-white',
            'truncate'
          )}
        >
          {clip.title}
        </h4>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {clip.subtitle || clip.transcript}
        </p>

        {/* Meta */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <ClockIcon className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {formatTimeRange(clip.startTime, clip.endTime)}
            </span>
          </div>
          {clip.fileSize && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatFileSize(clip.fileSize)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
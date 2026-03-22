'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProcessingStatusProps {
  progress: number;
  message: string;
  estimatedTimeRemaining: number | null;
  className?: string;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 5) return 'Almost done...';
  if (seconds < 60) return `~${Math.ceil(seconds)}s remaining`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (minutes < 60) {
    return secs > 0 ? `~${minutes}m ${secs}s remaining` : `~${minutes}m remaining`;
  }
  return `~${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`;
}

export function ProcessingStatusBar({
  progress,
  message,
  estimatedTimeRemaining,
  className,
}: ProcessingStatusProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const isComplete = clampedProgress >= 100;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
          {message}
        </p>
        <span
          className={cn(
            'text-sm font-bold tabular-nums shrink-0',
            isComplete
              ? 'text-green-600 dark:text-green-400'
              : 'text-brand-600 dark:text-brand-400'
          )}
        >
          {Math.round(clampedProgress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            isComplete
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-gradient-to-r from-brand-500 to-brand-400 dark:from-brand-400 dark:to-brand-300'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Shimmer */}
        {!isComplete && clampedProgress > 0 && (
          <motion.div
            className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ['-80px', '500px'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* ETA */}
      {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && !isComplete && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatTimeRemaining(estimatedTimeRemaining)}
        </p>
      )}
    </div>
  );
}
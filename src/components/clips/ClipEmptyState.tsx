'use client';

import React from 'react';
import { FilmIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ClipEmptyStateProps {
  className?: string;
}

export function ClipEmptyState({ className }: ClipEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-16 px-6',
        'rounded-2xl',
        'border border-dashed border-border-light dark:border-border-dark',
        'bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/30',
        className
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl',
          'bg-gray-100 dark:bg-surface-dark-tertiary',
          'flex items-center justify-center',
          'mb-4'
        )}
      >
        <FilmIcon className="w-7 h-7 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        No clips generated
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
        Clips will appear here once processing is complete.
      </p>
    </div>
  );
}
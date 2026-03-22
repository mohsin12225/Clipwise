'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export function ProjectCardSkeleton() {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-surface-dark-secondary',
        'border border-border-light dark:border-border-dark'
      )}
    >
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton variant="line" className="h-4 w-3/4" />
        <Skeleton variant="line" className="h-3 w-full" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton variant="line" className="h-3 w-16" />
          <Skeleton variant="line" className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}
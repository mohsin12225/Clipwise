'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface ClipListSkeletonProps {
  layout?: 'grid' | 'list';
  count?: number;
  className?: string;
}

function ClipCardSkeleton() {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white dark:bg-surface-dark-secondary',
        'border border-border-light dark:border-border-dark'
      )}
    >
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton variant="line" className="h-4 w-3/4" />
        <Skeleton variant="line" className="h-3 w-full" />
        <Skeleton variant="line" className="h-3 w-1/2" />
        <Skeleton variant="line" className="h-3 w-24 mt-1" />
      </div>
    </div>
  );
}

function ClipListItemSkeleton() {
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-xl',
        'bg-white dark:bg-surface-dark-secondary',
        'border border-border-light dark:border-border-dark'
      )}
    >
      <Skeleton className="w-28 aspect-video rounded-lg shrink-0" />
      <div className="flex-1 py-0.5 space-y-2">
        <Skeleton variant="line" className="h-4 w-3/4" />
        <Skeleton variant="line" className="h-3 w-full" />
        <Skeleton variant="line" className="h-3 w-32" />
      </div>
    </div>
  );
}

export function ClipListSkeleton({
  layout = 'grid',
  count = 6,
  className,
}: ClipListSkeletonProps) {
  return (
    <div
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'flex flex-col gap-2',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) =>
        layout === 'grid' ? (
          <ClipCardSkeleton key={i} />
        ) : (
          <ClipListItemSkeleton key={i} />
        )
      )}
    </div>
  );
}
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export default function ProjectLoading() {
  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Skeleton variant="line" className="h-4 w-32 mb-6" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton variant="line" className="h-6 w-48" />
          <Skeleton variant="rectangle" className="h-6 w-20 rounded-lg" />
        </div>

        {/* Video preview */}
        <Skeleton variant="rectangle" className="aspect-video w-full rounded-xl mb-6" />

        {/* Status card */}
        <div
          className={cn(
            'rounded-2xl p-5',
            'bg-white dark:bg-surface-dark-secondary',
            'border border-border-light dark:border-border-dark'
          )}
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton variant="line" className="h-4 w-40" />
              <Skeleton variant="line" className="h-4 w-10" />
            </div>
            <Skeleton variant="rectangle" className="h-2 w-full rounded-full" />
          </div>
        </div>

        {/* Steps card */}
        <div
          className={cn(
            'rounded-2xl p-5 mt-6',
            'bg-white dark:bg-surface-dark-secondary',
            'border border-border-light dark:border-border-dark'
          )}
        >
          <Skeleton variant="line" className="h-4 w-32 mb-4" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton variant="circle" className="w-8 h-8" />
                <div className="flex-1">
                  <Skeleton variant="line" className="h-4 w-32 mb-1.5" />
                  <Skeleton variant="line" className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { ProjectCardSkeleton } from '@/components/dashboard/ProjectCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export default function DashboardLoading() {
  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Input skeleton */}
        <div className="mb-10">
          <div
            className={cn(
              'rounded-2xl p-6 sm:p-8',
              'bg-white dark:bg-surface-dark-secondary',
              'border border-border-light dark:border-border-dark'
            )}
          >
            <div className="text-center mb-6">
              <Skeleton
                variant="rectangle"
                className="w-12 h-12 rounded-2xl mx-auto mb-4"
              />
              <Skeleton variant="line" className="h-5 w-56 mx-auto mb-2" />
              <Skeleton variant="line" className="h-4 w-72 mx-auto" />
            </div>
            <Skeleton variant="rectangle" className="h-12 w-full rounded-xl mb-4" />
            <Skeleton variant="rectangle" className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* Projects header skeleton */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <Skeleton variant="line" className="h-5 w-32 mb-1.5" />
            <Skeleton variant="line" className="h-3.5 w-20" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

export default function EditorLoading() {
  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto">
        <div
          className={cn(
            'rounded-2xl p-8',
            'bg-white dark:bg-surface-dark-secondary',
            'border border-border-light dark:border-border-dark'
          )}
        >
          <Skeleton variant="line" className="h-6 w-32 mx-auto mb-4" />
          <Skeleton variant="rectangle" className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
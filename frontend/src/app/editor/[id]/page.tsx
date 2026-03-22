'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <PageWrapper maxWidth="full">
      <div className="max-w-5xl mx-auto">
        <Card padding="lg">
          <div className="text-center">
            <h1
              className={cn(
                'text-xl font-semibold',
                'text-gray-900 dark:text-white'
              )}
            >
              Clip Editor
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Editor for project{' '}
              <code className="text-xs bg-gray-100 dark:bg-surface-dark-tertiary px-1.5 py-0.5 rounded-md">
                {projectId}
              </code>{' '}
              will be implemented in an upcoming step.
            </p>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LinkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { YoutubeInput } from '@/components/dashboard/YoutubeInput';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const router = useRouter();
  const { isCreating, createProject } = useProjectStore();
  const addToast = useUIStore((s) => s.addToast);

  const handleSubmit = useCallback(
    async (videoUrl: string) => {
      try {
        const project = await createProject(videoUrl);
        addToast('Project created! Processing started.', 'success');
        // Navigate to project page where polling will start automatically
        router.push(`/project/${project.id}`);
      } catch (err) {
        throw err;
      }
    },
    [createProject, addToast, router]
  );

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className={cn(
            'inline-flex items-center gap-1.5',
            'text-sm text-gray-500 dark:text-gray-400',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'transition-colors duration-200 mb-6'
          )}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            New Project
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Paste a YouTube video link to start generating AI-powered clips.
          </p>
        </motion.div>

        <YoutubeInput onSubmit={handleSubmit} isLoading={isCreating} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6">
          <div className={cn('rounded-xl p-4 bg-surface-light-secondary dark:bg-surface-dark-secondary border border-border-light dark:border-border-dark')}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported formats
            </h3>
            <ul className="space-y-1.5">
              {['youtube.com/watch?v=...', 'youtu.be/...', 'youtube.com/shorts/...'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <code className="bg-gray-100 dark:bg-surface-dark-tertiary px-1.5 py-0.5 rounded">{f}</code>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
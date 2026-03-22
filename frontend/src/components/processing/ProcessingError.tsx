'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ProcessingErrorProps {
  error: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ProcessingError({
  error,
  onRetry,
  isRetrying,
}: ProcessingErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl p-5',
        'bg-red-50 dark:bg-red-950/30',
        'border border-red-200 dark:border-red-800/50'
      )}
    >
      <div className="flex gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">
            Processing Failed
          </h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400/80">
            {error}
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              loading={isRetrying}
              icon={<ArrowPathIcon className="w-4 h-4" />}
            >
              Retry Processing
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
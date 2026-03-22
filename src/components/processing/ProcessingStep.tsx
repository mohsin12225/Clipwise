'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import type { ProcessingStep as ProcessingStepType } from '@/types';

interface ProcessingStepProps {
  step: ProcessingStepType;
  isLast: boolean;
}

export function ProcessingStep({ step, isLast }: ProcessingStepProps) {
  const isPending = step.status === 'pending';
  const isActive = step.status === 'active';
  const isCompleted = step.status === 'completed';
  const isError = step.status === 'error';

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        {/* Step indicator */}
        <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
          {isCompleted && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <CheckCircleIcon className="w-8 h-8 text-green-500 dark:text-green-400" />
            </motion.div>
          )}

          {isError && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <ExclamationCircleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
            </motion.div>
          )}

          {isActive && (
            <div className="relative">
              {/* Pulse ring */}
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full',
                  'bg-brand-400/20 dark:bg-brand-400/15'
                )}
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Spinning border */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full',
                  'border-[2.5px] border-gray-200 dark:border-gray-700',
                  'border-t-brand-500 dark:border-t-brand-400',
                  'animate-spin'
                )}
                style={{ animationDuration: '1s' }}
              />
              {/* Center dot */}
              <div
                className={cn(
                  'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                  'w-2 h-2 rounded-full',
                  'bg-brand-500 dark:bg-brand-400'
                )}
              />
            </div>
          )}

          {isPending && (
            <div
              className={cn(
                'w-8 h-8 rounded-full',
                'border-2 border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-surface-dark-secondary'
              )}
            />
          )}
        </div>

        {/* Connector line */}
        {!isLast && (
          <div className="flex-1 w-0.5 my-1.5 min-h-[24px]">
            <div
              className={cn(
                'w-full h-full rounded-full transition-colors duration-500',
                isCompleted
                  ? 'bg-green-400 dark:bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          </div>
        )}
      </div>

      {/* Content column */}
      <div className={cn('pb-6', isLast && 'pb-0')}>
        <div className="flex items-center gap-2 mt-1">
          <h4
            className={cn(
              'text-sm font-semibold transition-colors duration-300',
              isActive && 'text-brand-600 dark:text-brand-400',
              isCompleted && 'text-gray-900 dark:text-white',
              isError && 'text-red-600 dark:text-red-400',
              isPending && 'text-gray-400 dark:text-gray-500'
            )}
          >
            {step.label}
          </h4>

          {/* Stage progress for active step */}
          {isActive && step.progress > 0 && (
            <span className="text-xs font-medium text-brand-500 dark:text-brand-400">
              {Math.round(step.progress)}%
            </span>
          )}
        </div>

        <p
          className={cn(
            'mt-0.5 text-xs transition-colors duration-300',
            isActive && 'text-gray-600 dark:text-gray-400',
            isCompleted && 'text-gray-500 dark:text-gray-400',
            isError && 'text-red-500 dark:text-red-400',
            isPending && 'text-gray-400 dark:text-gray-500'
          )}
        >
          {step.description}
        </p>

        {/* Progress bar for active step */}
        {isActive && step.progress > 0 && (
          <div className="mt-2.5 w-full max-w-[200px]">
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-brand-500 dark:bg-brand-400"
                initial={{ width: 0 }}
                animate={{ width: `${step.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
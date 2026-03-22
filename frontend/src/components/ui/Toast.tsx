'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ToastVariant } from '@/store/useUIStore';

interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; containerClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircleIcon,
    containerClass:
      'bg-white dark:bg-surface-dark-secondary border-green-200 dark:border-green-800/50',
    iconClass: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: ExclamationCircleIcon,
    containerClass:
      'bg-white dark:bg-surface-dark-secondary border-red-200 dark:border-red-800/50',
    iconClass: 'text-red-500 dark:text-red-400',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    containerClass:
      'bg-white dark:bg-surface-dark-secondary border-yellow-200 dark:border-yellow-800/50',
    iconClass: 'text-yellow-500 dark:text-yellow-400',
  },
  info: {
    icon: InformationCircleIcon,
    containerClass:
      'bg-white dark:bg-surface-dark-secondary border-brand-200 dark:border-brand-800/50',
    iconClass: 'text-brand-500 dark:text-brand-400',
  },
};

export function Toast({ id, message, variant, onDismiss }: ToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'flex items-start gap-3',
        'px-4 py-3',
        'rounded-xl border',
        'shadow-soft-md dark:shadow-none',
        'min-w-[320px] max-w-[420px]',
        config.containerClass
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconClass)} />
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-snug">
        {message}
      </p>
      <button
        onClick={() => onDismiss(id)}
        className={cn(
          'shrink-0 p-0.5 rounded-lg',
          'text-gray-400 hover:text-gray-600',
          'dark:text-gray-500 dark:hover:text-gray-300',
          'transition-colors duration-150'
        )}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
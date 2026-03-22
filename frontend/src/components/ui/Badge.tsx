'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: [
    'bg-green-50 text-green-700 border-green-200',
    'dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50',
  ].join(' '),
  warning: [
    'bg-yellow-50 text-yellow-700 border-yellow-200',
    'dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/50',
  ].join(' '),
  error: [
    'bg-red-50 text-red-700 border-red-200',
    'dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  ].join(' '),
  info: [
    'bg-brand-50 text-brand-700 border-brand-200',
    'dark:bg-brand-950/40 dark:text-brand-400 dark:border-brand-800/50',
  ].join(' '),
  neutral: [
    'bg-gray-50 text-gray-600 border-gray-200',
    'dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
  ].join(' '),
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green-500 dark:bg-green-400',
  warning: 'bg-yellow-500 dark:bg-yellow-400',
  error: 'bg-red-500 dark:bg-red-400',
  info: 'bg-brand-500 dark:bg-brand-400',
  neutral: 'bg-gray-400 dark:bg-gray-500',
};

export function Badge({
  variant = 'neutral',
  children,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-0.5',
        'text-xs font-medium',
        'rounded-lg border',
        'transition-colors duration-200',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
'use client';

import React from 'react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

export function Footer() {
  return (
    <footer
      className={cn(
        'border-t border-border-light dark:border-border-dark',
        'bg-surface-light-secondary dark:bg-surface-dark',
        'transition-colors duration-250'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} ClipWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
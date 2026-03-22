'use client';

import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center',
        'w-9 h-9 rounded-xl',
        'transition-all duration-200',
        'text-gray-600 dark:text-gray-400',
        'hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-surface-dark',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon - visible in dark mode (click to go light) */}
        <SunIcon
          className={cn(
            'absolute inset-0 w-5 h-5',
            'transition-all duration-300',
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-50'
          )}
        />
        {/* Moon icon - visible in light mode (click to go dark) */}
        <MoonIcon
          className={cn(
            'absolute inset-0 w-5 h-5',
            'transition-all duration-300',
            isDark
              ? 'opacity-0 -rotate-90 scale-50'
              : 'opacity-100 rotate-0 scale-100'
          )}
        />
      </div>
    </button>
  );
}
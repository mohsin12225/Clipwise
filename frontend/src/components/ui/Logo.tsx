'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 'w-6 h-6', text: 'text-base' },
  md: { icon: 'w-7 h-7', text: 'text-lg' },
  lg: { icon: 'w-9 h-9', text: 'text-xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2',
        'transition-opacity hover:opacity-80',
        className
      )}
    >
      {/* Logo Icon */}
      <div
        className={cn(
          config.icon,
          'rounded-lg bg-brand-600 dark:bg-brand-500',
          'flex items-center justify-center',
          'shadow-soft-xs'
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-[60%] h-[60%]"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" fill="white" stroke="none" />
        </svg>
      </div>
      {showText && (
        <span
          className={cn(
            config.text,
            'font-bold tracking-tight',
            'text-gray-900 dark:text-white'
          )}
        >
          ClipWise
        </span>
      )}
    </Link>
  );
}
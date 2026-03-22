'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'line' | 'circle' | 'rectangle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangle',
  width,
  height,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'animate-pulse',
        'bg-gray-200 dark:bg-gray-700/50',
        variant === 'circle' && 'rounded-full',
        variant === 'line' && 'rounded-md h-4',
        variant === 'rectangle' && 'rounded-xl',
        className
      )}
      style={style}
    />
  );
}
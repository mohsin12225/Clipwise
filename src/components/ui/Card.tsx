'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  as?: React.ElementType;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  children,
  className,
  padding = 'md',
  hover = false,
  as: Component = 'div',
  onClick,
}: CardProps) {
  return (
    <Component
      className={cn(
        // Base surface
        'bg-white rounded-2xl',
        'border border-border-light',
        'dark:bg-surface-dark-secondary dark:border-border-dark',
        // Shadow
        'shadow-soft-sm',
        'dark:shadow-none',
        // Transitions
        'transition-all duration-200',
        // Hover
        hover && [
          'cursor-pointer',
          'hover:shadow-soft-md hover:border-border-light-secondary',
          'hover:-translate-y-0.5',
          'dark:hover:border-border-dark-secondary',
          'active:translate-y-0 active:shadow-soft-sm',
        ],
        // Padding
        paddingStyles[padding],
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}
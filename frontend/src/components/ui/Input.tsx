'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium',
              'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'text-gray-400 dark:text-gray-500',
                '[&>svg]:w-4 [&>svg]:h-4'
              )}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base
              'w-full h-10 px-3 text-sm',
              'rounded-xl',
              'transition-all duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              // Default state
              'bg-white border border-border-light',
              'text-gray-900',
              'dark:bg-surface-dark-secondary dark:border-border-dark',
              'dark:text-gray-100',
              // Hover
              'hover:border-border-light-secondary',
              'dark:hover:border-border-dark-secondary',
              // Focus
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
              'dark:focus:ring-brand-400/20 dark:focus:border-brand-400',
              // Error
              hasError && [
                'border-red-500 hover:border-red-500',
                'focus:ring-red-500/20 focus:border-red-500',
                'dark:border-red-400 dark:hover:border-red-400',
                'dark:focus:ring-red-400/20 dark:focus:border-red-400',
              ],
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'disabled:bg-gray-50 dark:disabled:bg-surface-dark',
              // Icon padding
              icon && 'pl-9',
              className
            )}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <p
            className={cn(
              'text-xs',
              hasError
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
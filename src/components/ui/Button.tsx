'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-brand-600 text-white',
    'hover:bg-brand-700',
    'active:bg-brand-800',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'dark:bg-brand-500 dark:hover:bg-brand-600 dark:active:bg-brand-700',
    'dark:focus-visible:ring-offset-surface-dark',
    'disabled:bg-brand-300 dark:disabled:bg-brand-800',
  ].join(' '),

  secondary: [
    'bg-white text-gray-700 border border-border-light',
    'hover:bg-surface-light-secondary hover:border-border-light-secondary',
    'active:bg-surface-light-tertiary',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'dark:bg-surface-dark-secondary dark:text-gray-200 dark:border-border-dark',
    'dark:hover:bg-surface-dark-tertiary dark:hover:border-border-dark-secondary',
    'dark:focus-visible:ring-offset-surface-dark',
    'disabled:bg-gray-50 disabled:text-gray-400',
    'dark:disabled:bg-surface-dark dark:disabled:text-gray-600',
  ].join(' '),

  ghost: [
    'bg-transparent text-gray-700',
    'hover:bg-gray-100',
    'active:bg-gray-200',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'dark:text-gray-300 dark:hover:bg-surface-dark-tertiary dark:active:bg-gray-600',
    'dark:focus-visible:ring-offset-surface-dark',
    'disabled:text-gray-400 dark:disabled:text-gray-600',
  ].join(' '),

  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'active:bg-red-800',
    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    'dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700',
    'dark:focus-visible:ring-offset-surface-dark',
    'disabled:bg-red-300 dark:disabled:bg-red-900',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="16"
    height="16"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium',
          'transition-all duration-200 ease-out',
          'select-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span>{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === 'right' && (
              <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
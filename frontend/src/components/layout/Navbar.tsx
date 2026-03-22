'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon,
  CloudArrowUpIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon },
  { label: 'Upload', href: '/upload', icon: CloudArrowUpIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        'h-16',
        'bg-white/80 dark:bg-surface-dark/80',
        'backdrop-blur-xl',
        'border-b border-border-light dark:border-border-dark',
        'transition-colors duration-250'
      )}
    >
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-full flex items-center justify-between">
          {/* Left: Logo */}
          <Logo size="md" />

          {/* Center: Navigation Links (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'inline-flex items-center gap-2',
                    'px-3 py-2 rounded-xl',
                    'text-sm font-medium',
                    'transition-all duration-200',
                    isActive
                      ? [
                          'bg-brand-50 text-brand-700',
                          'dark:bg-brand-950/50 dark:text-brand-400',
                        ]
                      : [
                          'text-gray-600 dark:text-gray-400',
                          'hover:bg-gray-100 hover:text-gray-900',
                          'dark:hover:bg-surface-dark-tertiary dark:hover:text-gray-200',
                        ]
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'md:hidden',
                'inline-flex items-center justify-center',
                'w-9 h-9 rounded-xl',
                'text-gray-600 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary',
                'transition-colors duration-200'
              )}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          className={cn(
            'md:hidden',
            'absolute top-16 inset-x-0',
            'bg-white dark:bg-surface-dark',
            'border-b border-border-light dark:border-border-dark',
            'shadow-soft-lg',
            'animate-slide-down'
          )}
        >
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3',
                    'px-3 py-2.5 rounded-xl',
                    'text-sm font-medium',
                    'transition-colors duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-surface-dark-secondary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
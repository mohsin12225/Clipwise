'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon,
  FolderIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon },
  { label: 'Projects', href: '/dashboard', icon: FolderIcon },
  { label: 'Upload', href: '/upload', icon: CloudArrowUpIcon },
  { label: 'Settings', href: '#', icon: Cog6ToothIcon },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col',
        'w-60 shrink-0',
        'h-[calc(100vh-4rem)]',
        'sticky top-16',
        'border-r border-border-light dark:border-border-dark',
        'bg-surface-light-secondary dark:bg-surface-dark',
        'transition-colors duration-250',
        'overflow-y-auto scrollbar-thin',
        className
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' &&
              item.href !== '#' &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'group flex items-center gap-3',
                'px-3 py-2.5 rounded-xl',
                'text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? [
                      'bg-white text-brand-700 shadow-soft-xs',
                      'dark:bg-surface-dark-secondary dark:text-brand-400',
                      'border border-border-light/50 dark:border-border-dark',
                    ]
                  : [
                      'text-gray-600 dark:text-gray-400',
                      'hover:bg-white/60 hover:text-gray-900',
                      'dark:hover:bg-surface-dark-secondary/60 dark:hover:text-gray-200',
                      'border border-transparent',
                    ]
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  'transition-colors duration-200',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border-light dark:border-border-dark">
        <div
          className={cn(
            'px-3 py-3 rounded-xl',
            'bg-brand-50 dark:bg-brand-950/30',
            'border border-brand-100 dark:border-brand-900/50'
          )}
        >
          <p className="text-xs font-semibold text-brand-800 dark:text-brand-300">
            Free Plan
          </p>
          <p className="text-xs text-brand-600/80 dark:text-brand-400/70 mt-0.5">
            All processing is local
          </p>
        </div>
      </div>
    </aside>
  );
}
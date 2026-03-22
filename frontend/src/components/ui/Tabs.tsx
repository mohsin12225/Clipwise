'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5',
        'p-1 rounded-xl',
        'bg-surface-light-secondary dark:bg-surface-dark-tertiary',
        'border border-border-light dark:border-border-dark',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-1.5 rounded-lg',
              'text-sm font-medium',
              'transition-colors duration-200',
              'flex items-center gap-1.5',
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="tab-bg"
                className={cn(
                  'absolute inset-0 rounded-lg',
                  'bg-white dark:bg-surface-dark-secondary',
                  'shadow-soft-xs dark:shadow-none',
                  'border border-border-light/50 dark:border-border-dark'
                )}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && (
                <span className="[&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>
              )}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
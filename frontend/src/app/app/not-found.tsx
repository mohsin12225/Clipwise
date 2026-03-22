'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div
      className={cn(
        'flex-1 flex items-center justify-center',
        'px-4 py-16'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <p className="text-6xl font-bold text-brand-600 dark:text-brand-400">
          404
        </p>
        <h1
          className={cn(
            'mt-4 text-xl font-semibold',
            'text-gray-900 dark:text-white'
          )}
        >
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8">
          <Link href="/dashboard">
            <Button variant="secondary" icon={<HomeIcon className="w-4 h-4" />}>
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
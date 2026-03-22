'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface DeleteModalProps {
  isOpen: boolean;
  projectTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({
  isOpen,
  projectTitle,
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60"
            onClick={onCancel}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className={cn(
                'w-full max-w-sm',
                'rounded-2xl',
                'bg-white dark:bg-surface-dark-secondary',
                'border border-border-light dark:border-border-dark',
                'shadow-soft-xl dark:shadow-none',
                'p-6'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="flex justify-end -mt-1 -mr-1">
                <button
                  onClick={onCancel}
                  className={cn(
                    'p-1.5 rounded-lg',
                    'text-gray-400 hover:text-gray-600',
                    'dark:text-gray-500 dark:hover:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary',
                    'transition-colors duration-150'
                  )}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl',
                    'bg-red-50 dark:bg-red-950/40',
                    'flex items-center justify-center'
                  )}
                >
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
              </div>

              {/* Text */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Project
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    &ldquo;{projectTitle}&rdquo;
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={onConfirm}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
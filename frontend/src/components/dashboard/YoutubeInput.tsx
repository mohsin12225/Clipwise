'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LinkIcon,
  SparklesIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  validateYoutubeUrl,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
} from '@/lib/validators';

interface YoutubeInputProps {
  onSubmit: (videoUrl: string) => Promise<void>;
  isLoading: boolean;
}

export function YoutubeInput({ onSubmit, isLoading }: YoutubeInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const validation = validateYoutubeUrl(url);
  const videoId = extractYoutubeVideoId(url);
  const hasInput = url.trim().length > 0;
  const canSubmit = validation.isValid && !isLoading;

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUrl(value);

      // Clear error when user starts typing
      if (error) setError(null);
    },
    [error]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const result = validateYoutubeUrl(url);
      if (!result.isValid) {
        setError(result.error || 'Please enter a valid YouTube URL');
        return;
      }

      try {
        await onSubmit(url.trim());
        setUrl('');
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create project'
        );
      }
    },
    [url, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canSubmit) {
        handleSubmit(e);
      }
    },
    [canSubmit, handleSubmit]
  );

  const handlePaste = useCallback(() => {
    // Clear any previous error on paste
    if (error) setError(null);
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div
        className={cn(
          'relative',
          'rounded-2xl',
          'bg-white dark:bg-surface-dark-secondary',
          'border border-border-light dark:border-border-dark',
          'shadow-soft-md dark:shadow-none',
          'p-6 sm:p-8',
          'transition-all duration-250'
        )}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={cn(
              'inline-flex items-center justify-center',
              'w-12 h-12 rounded-2xl mb-4',
              'bg-brand-50 dark:bg-brand-950/40'
            )}
          >
            <SparklesIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Clips from YouTube
          </h2>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            Paste a YouTube video link and AI will generate short clips
            automatically.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            {/* Input with icon */}
            <div className="relative">
              <div
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2',
                  'transition-colors duration-200',
                  isFocused
                    ? 'text-brand-500 dark:text-brand-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                <LinkIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Paste YouTube link here..."
                disabled={isLoading}
                className={cn(
                  'w-full h-12 pl-12 pr-4',
                  'text-sm',
                  'rounded-xl',
                  'transition-all duration-200',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  // Background and text
                  'bg-surface-light-secondary dark:bg-surface-dark-tertiary',
                  'text-gray-900 dark:text-gray-100',
                  // Border
                  'border',
                  error
                    ? 'border-red-300 dark:border-red-700'
                    : isFocused
                      ? 'border-brand-400 dark:border-brand-500'
                      : 'border-border-light dark:border-border-dark',
                  // Focus ring
                  'focus:outline-none',
                  isFocused &&
                    !error &&
                    'ring-2 ring-brand-500/10 dark:ring-brand-400/10',
                  error && 'ring-2 ring-red-500/10 dark:ring-red-400/10',
                  // Disabled
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 mt-2"
              >
                <ExclamationCircleIcon className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              </motion.div>
            )}
          </div>

          {/* Video preview thumbnail */}
          {videoId && !error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'flex items-center gap-3',
                  'p-3 rounded-xl',
                  'bg-surface-light-secondary dark:bg-surface-dark-tertiary',
                  'border border-border-light dark:border-border-dark'
                )}
              >
                <img
                  src={getYoutubeThumbnailUrl(videoId, 'mq')}
                  alt="Video thumbnail"
                  className="w-20 h-[45px] object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    YouTube Video
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {url}
                  </p>
                </div>
                <div className="shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!canSubmit}
            icon={<SparklesIcon className="w-5 h-5" />}
          >
            {isLoading ? 'Creating Clips...' : 'Create Clips'}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
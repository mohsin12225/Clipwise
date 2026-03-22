'use client';

import React, { useState } from 'react';
import { FilmIcon, PlayIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
  getYoutubeEmbedUrl,
} from '@/lib/validators';

interface VideoPreviewProps {
  videoUrl: string;
  className?: string;
}

export function VideoPreview({ videoUrl, className }: VideoPreviewProps) {
  const [showEmbed, setShowEmbed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const videoId = extractYoutubeVideoId(videoUrl);
  const thumbnailUrl =
    videoId && !imageError ? getYoutubeThumbnailUrl(videoId, 'sd') : null;

  if (showEmbed && videoId) {
    return (
      <div className={cn('relative aspect-video rounded-xl overflow-hidden', className)}>
        <iframe
          src={`${getYoutubeEmbedUrl(videoId)}?autoplay=0&modestbranding=1&rel=0`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video preview"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative aspect-video rounded-xl overflow-hidden',
        'bg-gray-100 dark:bg-surface-dark-tertiary',
        'cursor-pointer group',
        className
      )}
      onClick={() => videoId && setShowEmbed(true)}
    >
      {thumbnailUrl ? (
        <>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          {/* Play button overlay */}
          <div
            className={cn(
              'absolute inset-0',
              'flex items-center justify-center',
              'bg-black/20 group-hover:bg-black/30',
              'transition-colors duration-200'
            )}
          >
            <div
              className={cn(
                'w-14 h-14 rounded-full',
                'bg-white/90 dark:bg-white/80',
                'flex items-center justify-center',
                'shadow-soft-md',
                'group-hover:scale-110',
                'transition-transform duration-200'
              )}
            >
              <PlayIcon className="w-6 h-6 text-gray-900 ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FilmIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useRef, useEffect } from 'react';
import {
  ClockIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  formatDuration,
  formatTimeRange,
  formatDurationHuman,
} from '@/lib/formatTime';
import { resolveStorageUrl } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils';
import type { ClipData } from '@/types';

interface ClipPreviewModalProps {
  clip: ClipData | null;
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ClipPreviewModal({
  clip,
  videoUrl,
  isOpen,
  onClose,
}: ClipPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  if (!clip) return null;

  const scorePercent = Math.round((clip.score || 0) * 100);
  const clipVideoSrc = clip.videoUrl ? resolveStorageUrl(clip.videoUrl) : null;
  const clipThumbSrc = clip.thumbnailUrl ? resolveStorageUrl(clip.thumbnailUrl) : undefined;

  const handleDownload = () => {
    if (!clipVideoSrc) return;
    const link = document.createElement('a');
    link.href = clipVideoSrc;
    link.download = `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={clip.title} size="lg">
      <div className="p-6 space-y-5">
        {/* Video Player — Real clip playback */}
        {clipVideoSrc ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={clipVideoSrc}
              poster={clipThumbSrc}
              controls
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : (
          <div
            className={cn(
              'aspect-video rounded-xl',
              'bg-gray-100 dark:bg-surface-dark-tertiary',
              'flex items-center justify-center'
            )}
          >
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Video file not available
            </p>
          </div>
        )}

        {/* Clip Info */}
        <div className="space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {formatDurationHuman(clip.duration)}
              </span>
            </Badge>

            <Badge variant="neutral">
              {formatTimeRange(clip.startTime, clip.endTime)}
            </Badge>

            {scorePercent > 0 && (
              <Badge variant="warning">
                <span className="flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  {scorePercent}% relevance
                </span>
              </Badge>
            )}

            {clip.fileSize && (
              <Badge variant="neutral">
                {formatFileSize(clip.fileSize)}
              </Badge>
            )}
          </div>

          {/* Download button */}
          {clipVideoSrc && (
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={handleDownload}
            >
              Download Clip
            </Button>
          )}

          {/* Reason */}
          {clip.reason && (
            <div
              className={cn(
                'p-3.5 rounded-xl',
                'bg-brand-50 dark:bg-brand-950/30',
                'border border-brand-100 dark:border-brand-900/50'
              )}
            >
              <div className="flex items-start gap-2">
                <SparklesIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-brand-800 dark:text-brand-300 mb-0.5">
                    Why this clip?
                  </p>
                  <p className="text-sm text-brand-700 dark:text-brand-400/90 leading-relaxed">
                    {clip.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transcript / Subtitle */}
          {(clip.transcript || clip.subtitle) && (
            <div
              className={cn(
                'p-3.5 rounded-xl',
                'bg-surface-light-secondary dark:bg-surface-dark-tertiary',
                'border border-border-light dark:border-border-dark'
              )}
            >
              <div className="flex items-start gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {clip.subtitle || clip.transcript}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Captions */}
          {clip.captions && clip.captions.length > 0 && (
            <div
              className={cn(
                'p-3.5 rounded-xl',
                'bg-surface-light-secondary dark:bg-surface-dark-tertiary',
                'border border-border-light dark:border-border-dark'
              )}
            >
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Captions ({clip.captions.length} segments)
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                {clip.captions.map((caption) => (
                  <div
                    key={caption.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0 mt-0.5 font-mono">
                      {formatDuration(caption.startTime)}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {caption.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
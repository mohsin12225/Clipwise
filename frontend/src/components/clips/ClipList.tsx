'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipItem } from '@/components/clips/ClipItem';
import { ClipListSkeleton } from '@/components/clips/ClipListSkeleton';
import { ClipEmptyState } from '@/components/clips/ClipEmptyState';
import { cn } from '@/lib/utils';
import type { ClipData } from '@/types';

interface ClipListProps {
  clips: ClipData[];
  videoUrl: string;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
  onPreviewClip: (clipId: string) => void;
  layout?: 'grid' | 'list';
  isLoading?: boolean;
  className?: string;
}

const containerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export function ClipList({
  clips,
  videoUrl,
  selectedClipId,
  onSelectClip,
  onPreviewClip,
  layout = 'grid',
  isLoading = false,
  className,
}: ClipListProps) {
  if (isLoading) {
    return <ClipListSkeleton layout={layout} className={className} />;
  }

  if (clips.length === 0) {
    return <ClipEmptyState className={className} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'flex flex-col gap-2',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {clips.map((clip) => (
          <ClipItem
            key={clip.id}
            clip={clip}
            videoUrl={videoUrl}
            isSelected={selectedClipId === clip.id}
            onSelect={onSelectClip}
            onPreview={onPreviewClip}
            layout={layout}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
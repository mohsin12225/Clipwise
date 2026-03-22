'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ProcessingStep as ProcessingStepComponent } from '@/components/processing/ProcessingStep';
import { cn } from '@/lib/utils';
import type { ProcessingStep } from '@/types';

interface ProcessingTimelineProps {
  steps: ProcessingStep[];
  className?: string;
}

export function ProcessingTimeline({
  steps,
  className,
}: ProcessingTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn('py-2', className)}
    >
      {steps.map((step, index) => (
        <ProcessingStepComponent
          key={step.id}
          step={step}
          isLast={index === steps.length - 1}
        />
      ))}
    </motion.div>
  );
}
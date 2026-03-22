'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CloudArrowUpIcon,
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowDownTrayIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';

// ─── Animation Variants ──────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// ─── Features Data ───────────────────────────────────────────────

const features = [
  {
    icon: SparklesIcon,
    title: 'AI-Powered Detection',
    description:
      'Our AI analyzes your video to find the most engaging moments and automatically suggests clip boundaries.',
  },
  {
    icon: ChatBubbleBottomCenterTextIcon,
    title: 'Auto Captions',
    description:
      'Whisper-powered transcription generates accurate captions with precise timing, ready to customize.',
  },
  {
    icon: PlayCircleIcon,
    title: 'Timeline Editor',
    description:
      'Fine-tune clips with a professional timeline editor. Trim, reorder, and preview in real time.',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'One-Click Export',
    description:
      'Export clips in multiple resolutions and formats. Download individually or as a batch.',
  },
];

// ─── Steps Data ──────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    title: 'Upload',
    description: 'Drop your long-form video into ClipWise.',
  },
  {
    number: '02',
    title: 'Process',
    description: 'AI transcribes, analyzes, and finds highlights.',
  },
  {
    number: '03',
    title: 'Edit',
    description: 'Review clips, adjust captions, choose templates.',
  },
  {
    number: '04',
    title: 'Export',
    description: 'Download your polished clips, ready to share.',
  },
];

// ─── Page Component ──────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* ━━━ Hero Section ━━━ */}
      <section
        className={cn(
          'relative overflow-hidden',
          'py-24 sm:py-32 lg:py-40',
          'px-4 sm:px-6 lg:px-8'
        )}
      >
        {/* Background gradient */}
        <div
          className={cn(
            'absolute inset-0 -z-10',
            'bg-gradient-to-b from-brand-50/50 via-white to-white',
            'dark:from-brand-950/20 dark:via-surface-dark dark:to-surface-dark'
          )}
        />

        {/* Subtle grid pattern */}
        <div
          className={cn(
            'absolute inset-0 -z-10',
            'bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)]',
            'dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)]',
            'bg-[size:4rem_4rem]',
            '[mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]'
          )}
        />

        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 mb-6">
              <SparklesIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-xs font-medium text-brand-700 dark:text-brand-300">
                100% Free & Local AI Processing
              </span>
            </div>

            {/* Headline */}
            <h1
              className={cn(
                'text-4xl sm:text-5xl lg:text-6xl',
                'font-bold tracking-tight',
                'text-gray-900 dark:text-white',
                'leading-[1.1]'
              )}
            >
              Turn long videos into{' '}
              <span className="text-brand-600 dark:text-brand-400">
                viral clips
              </span>{' '}
              with AI
            </h1>

            {/* Subtitle */}
            <p
              className={cn(
                'mt-6 text-lg sm:text-xl',
                'text-gray-600 dark:text-gray-400',
                'max-w-2xl mx-auto',
                'leading-relaxed'
              )}
            >
              Upload any video and let AI find the best moments, generate
              captions, and create share-ready clips — all processed locally on
              your machine.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/upload">
                <Button
                  size="lg"
                  icon={<CloudArrowUpIcon className="w-5 h-5" />}
                >
                  Upload Video
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero Visual - Video Player Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="mt-16 sm:mt-20"
          >
            <div
              className={cn(
                'relative rounded-2xl overflow-hidden',
                'border border-border-light dark:border-border-dark',
                'shadow-soft-xl dark:shadow-none',
                'bg-gray-100 dark:bg-surface-dark-secondary',
                'aspect-video max-w-3xl mx-auto'
              )}
            >
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary border-b border-border-light dark:border-border-dark">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-5 rounded-md bg-gray-200 dark:bg-surface-dark max-w-xs mx-auto" />
                </div>
              </div>
              {/* Content area */}
              <div className="p-6 sm:p-8 flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto">
                    <PlayCircleIcon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Your clips will appear here
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ━━━ Features Section ━━━ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <h2
              className={cn(
                'text-3xl sm:text-4xl font-bold tracking-tight',
                'text-gray-900 dark:text-white'
              )}
            >
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              A complete toolkit to transform long-form content into engaging
              short clips.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={fadeInUp}>
                  <Card padding="lg" className="h-full">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl',
                        'bg-brand-50 dark:bg-brand-950/40',
                        'flex items-center justify-center',
                        'mb-4'
                      )}
                    >
                      <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ━━━ How It Works Section ━━━ */}
      <section
        className={cn(
          'py-20 sm:py-28 px-4 sm:px-6 lg:px-8',
          'bg-surface-light-secondary dark:bg-surface-dark-secondary/50',
          'border-y border-border-light dark:border-border-dark'
        )}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4 }}
            className="text-center mb-14"
          >
            <h2
              className={cn(
                'text-3xl sm:text-4xl font-bold tracking-tight',
                'text-gray-900 dark:text-white'
              )}
            >
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              Four simple steps from video to viral clips.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeInUp}
                className="relative text-center"
              >
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-px bg-border-light dark:bg-border-dark" />
                )}
                {/* Step number */}
                <div
                  className={cn(
                    'inline-flex items-center justify-center',
                    'w-12 h-12 rounded-2xl',
                    'bg-white dark:bg-surface-dark-secondary',
                    'border border-border-light dark:border-border-dark',
                    'shadow-soft-sm dark:shadow-none',
                    'text-sm font-bold text-brand-600 dark:text-brand-400',
                    'relative z-10'
                  )}
                >
                  {step.number}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━ Bottom CTA ━━━ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2
            className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight',
              'text-gray-900 dark:text-white'
            )}
          >
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Upload your first video and see the magic happen. No sign-up
            required, everything runs locally.
          </p>
          <div className="mt-8">
            <Link href="/upload">
              <Button
                size="lg"
                icon={<CloudArrowUpIcon className="w-5 h-5" />}
              >
                Upload Your Video
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ━━━ Footer ━━━ */}
      <Footer />
    </div>
  );
}
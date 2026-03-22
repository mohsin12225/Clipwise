'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import type { Project } from '@/types';

interface ProjectGridProps {
  projects: Project[];
  onDelete: (projectId: string) => void;
}

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function ProjectGrid({ projects, onDelete }: ProjectGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={itemVariants} layout>
          <ProjectCard project={project} onDelete={onDelete} />
        </motion.div>
      ))}
    </motion.div>
  );
}
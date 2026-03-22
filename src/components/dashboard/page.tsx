'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { YoutubeInput } from '@/components/dashboard/YoutubeInput';
import { ProjectGrid } from '@/components/dashboard/ProjectGrid';
import { ProjectCardSkeleton } from '@/components/dashboard/ProjectCardSkeleton';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DeleteModal } from '@/components/dashboard/DeleteModal';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const {
    projects,
    isLoading,
    isCreating,
    error,
    fetchProjects,
    createProject,
    deleteProject,
    clearError,
  } = useProjectStore();

  const addToast = useUIStore((s) => s.addToast);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      addToast(error, 'error');
      clearError();
    }
  }, [error, addToast, clearError]);

  const handleCreateProject = useCallback(
    async (videoUrl: string) => {
      try {
        await createProject(videoUrl);
        addToast('Project created! Processing will begin shortly.', 'success');
      } catch (err) {
        // Error is handled in the store and shown via toast
        throw err;
      }
    },
    [createProject, addToast]
  );

  const handleDeleteRequest = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setDeleteTarget({ id: project.id, title: project.title });
      }
    },
    [projects]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      addToast('Project deleted.', 'info');
    } catch {
      addToast('Failed to delete project.', 'error');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteProject, addToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const hasProjects = projects.length > 0;

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* YouTube Input Section */}
        <section className="mb-10">
          <YoutubeInput
            onSubmit={handleCreateProject}
            isLoading={isCreating}
          />
        </section>

        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2
                className={cn(
                  'text-lg font-semibold',
                  'text-gray-900 dark:text-white'
                )}
              >
                Your Projects
              </h2>
              {hasProjects && (
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && !hasProjects && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasProjects && <EmptyState />}

          {/* Project grid */}
          {hasProjects && (
            <ProjectGrid
              projects={projects}
              onDelete={handleDeleteRequest}
            />
          )}
        </section>
      </div>

      {/* Delete confirmation modal */}
      <DeleteModal
        isOpen={deleteTarget !== null}
        projectTitle={deleteTarget?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </PageWrapper>
  );
}
import { create } from 'zustand';
import type { Project, ProjectStatus } from '@/types';
import { generateId } from '@/lib/utils';
import {
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
} from '@/lib/validators';
import {
  createProjectAPI,
  fetchProjectsAPI,
  deleteProjectAPI,
  ApiError,
} from '@/lib/api';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (videoUrl: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  updateProjectStatus: (
    projectId: string,
    status: ProjectStatus,
    updates?: Partial<Project>
  ) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  getProject: (projectId: string) => Project | undefined;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  isCreating: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetchProjectsAPI();
      if (response.success && response.data) {
        set({ projects: response.data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        set({ isLoading: false });
        return;
      }
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      });
    }
  },

  createProject: async (videoUrl: string) => {
    set({ isCreating: true, error: null });

    const videoId = extractYoutubeVideoId(videoUrl);
    const thumbnailUrl = videoId ? getYoutubeThumbnailUrl(videoId, 'hq') : '';

    // Create a temporary local ID
    const tempId = generateId();

    // Add placeholder project to UI immediately
    const placeholderProject: Project = {
      id: tempId,
      videoUrl: videoUrl.trim(),
      title: videoId ? `YouTube Video (${videoId})` : 'New Project',
      thumbnailUrl,
      status: 'processing',
      clipCount: 0,
      duration: 0,
      jobId: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      projects: [placeholderProject, ...state.projects],
    }));

    try {
      const response = await createProjectAPI(videoUrl);

      if (response.success && response.data) {
        const { projectId, jobId } = response.data;

        // Replace placeholder with real server data
        const realProject: Project = {
          ...placeholderProject,
          id: projectId,
          jobId: jobId,
          status: 'processing',
        };

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === tempId ? realProject : p
          ),
          isCreating: false,
        }));

        return realProject;
      } else {
        throw new Error(response.error || 'Failed to create project');
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        // Backend unavailable — keep placeholder but mark idle
        const offlineProject = {
          ...placeholderProject,
          status: 'idle' as ProjectStatus,
        };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === tempId ? offlineProject : p
          ),
          isCreating: false,
          error: 'Backend not available. Project saved locally.',
        }));
        return offlineProject;
      }

      // Real error — remove placeholder
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== tempId),
        isCreating: false,
        error: error instanceof Error ? error.message : 'Failed to create project',
      }));
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    const previous = get().projects;
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
    try {
      await deleteProjectAPI(projectId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) return;
      set({ projects: previous });
      throw error;
    }
  },

  updateProjectStatus: (projectId, status, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, status, ...updates, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  },

  updateProject: (projectId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  },

  getProject: (projectId) => {
    return get().projects.find((p) => p.id === projectId);
  },

  clearError: () => set({ error: null }),
}));
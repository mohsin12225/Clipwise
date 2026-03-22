import { create } from 'zustand';
import type { ClipData } from '@/types';

interface ClipState {
  // Clips indexed by projectId
  clipsByProject: Record<string, ClipData[]>;

  // Currently selected clip
  selectedClipId: string | null;

  // Preview modal
  previewClipId: string | null;

  // Actions
  setClipsForProject: (projectId: string, clips: ClipData[]) => void;
  getClipsForProject: (projectId: string) => ClipData[];
  getClipById: (projectId: string, clipId: string) => ClipData | null;
  selectClip: (clipId: string | null) => void;
  openPreview: (clipId: string) => void;
  closePreview: () => void;
  updateClip: (projectId: string, clipId: string, updates: Partial<ClipData>) => void;
  deleteClip: (projectId: string, clipId: string) => void;
  reorderClips: (projectId: string, clipIds: string[]) => void;
  clearProjectClips: (projectId: string) => void;
  getClipCount: (projectId: string) => number;
}

export const useClipStore = create<ClipState>((set, get) => ({
  clipsByProject: {},
  selectedClipId: null,
  previewClipId: null,

  setClipsForProject: (projectId: string, clips: ClipData[]) => {
    // Normalize clips: ensure all have projectId, order, and required fields
    const normalizedClips = clips.map((clip, index) => ({
      ...clip,
      projectId,
      order: clip.order ?? index,
      subtitle: clip.subtitle || clip.transcript?.substring(0, 120) || '',
      captions: clip.captions || [],
    }));

    // Sort by order
    normalizedClips.sort((a, b) => a.order - b.order);

    set((state) => ({
      clipsByProject: {
        ...state.clipsByProject,
        [projectId]: normalizedClips,
      },
    }));
  },

  getClipsForProject: (projectId: string) => {
    return get().clipsByProject[projectId] || [];
  },

  getClipById: (projectId: string, clipId: string) => {
    const clips = get().clipsByProject[projectId] || [];
    return clips.find((c) => c.id === clipId) || null;
  },

  selectClip: (clipId: string | null) => {
    set({ selectedClipId: clipId });
  },

  openPreview: (clipId: string) => {
    set({ previewClipId: clipId, selectedClipId: clipId });
  },

  closePreview: () => {
    set({ previewClipId: null });
  },

  updateClip: (projectId: string, clipId: string, updates: Partial<ClipData>) => {
    set((state) => {
      const clips = state.clipsByProject[projectId];
      if (!clips) return state;

      return {
        clipsByProject: {
          ...state.clipsByProject,
          [projectId]: clips.map((clip) =>
            clip.id === clipId ? { ...clip, ...updates } : clip
          ),
        },
      };
    });
  },

  deleteClip: (projectId: string, clipId: string) => {
    set((state) => {
      const clips = state.clipsByProject[projectId];
      if (!clips) return state;

      const filtered = clips.filter((c) => c.id !== clipId);
      // Reorder remaining
      const reordered = filtered.map((clip, index) => ({
        ...clip,
        order: index,
      }));

      return {
        clipsByProject: {
          ...state.clipsByProject,
          [projectId]: reordered,
        },
        selectedClipId:
          state.selectedClipId === clipId ? null : state.selectedClipId,
        previewClipId:
          state.previewClipId === clipId ? null : state.previewClipId,
      };
    });
  },

  reorderClips: (projectId: string, clipIds: string[]) => {
    set((state) => {
      const clips = state.clipsByProject[projectId];
      if (!clips) return state;

      const clipMap = new Map(clips.map((c) => [c.id, c]));
      const reordered = clipIds
        .map((id, index) => {
          const clip = clipMap.get(id);
          if (!clip) return null;
          return { ...clip, order: index };
        })
        .filter(Boolean) as ClipData[];

      return {
        clipsByProject: {
          ...state.clipsByProject,
          [projectId]: reordered,
        },
      };
    });
  },

  clearProjectClips: (projectId: string) => {
    set((state) => {
      const newClips = { ...state.clipsByProject };
      delete newClips[projectId];
      return { clipsByProject: newClips };
    });
  },

  getClipCount: (projectId: string) => {
    return (get().clipsByProject[projectId] || []).length;
  },
}));
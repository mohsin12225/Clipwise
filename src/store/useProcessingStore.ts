import { create } from 'zustand';
import type {
  ProcessingStage,
  ProcessingStep,
  ProcessingStatus,
  ClipData,
} from '@/types';
import { useClipStore } from './useClipStore';

// ─── Stage Definitions ──────────────────────────────────────────

const STAGE_ORDER: ProcessingStage[] = [
  'queued',
  'fetching',
  'transcribing',
  'analyzing',
  'generating',
  'completed',
];

function createInitialSteps(): ProcessingStep[] {
  return [
    {
      id: 'fetching',
      label: 'Fetching Video',
      description: 'Downloading and extracting audio from the video',
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'transcribing',
      label: 'Transcribing Audio',
      description: 'Converting speech to text with timestamps',
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'analyzing',
      label: 'Analyzing Content',
      description: 'AI is identifying the most engaging moments',
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'generating',
      label: 'Generating Clips',
      description: 'Creating clips with captions and thumbnails',
      status: 'pending',
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
  ];
}

// ─── Store Types ─────────────────────────────────────────────────

interface ActiveJob {
  jobId: string;
  projectId: string;
}

interface ProjectProcessingState {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  stage: ProcessingStage;
  stageProgress: number;
  message: string;
  error: string | null;
  steps: ProcessingStep[];
  clips: ClipData[];
  startedAt: string | null;
  estimatedTimeRemaining: number | null;
}

interface ProcessingState {
  activeJobs: Map<string, ActiveJob>;
  statuses: Map<string, ProjectProcessingState>;

  startTracking: (projectId: string, jobId: string) => void;
  stopTracking: (projectId: string) => void;
  updateFromServer: (projectId: string, serverStatus: ProcessingStatus) => void;
  setError: (projectId: string, error: string) => void;
  reset: (projectId: string) => void;
  getStatus: (projectId: string) => ProjectProcessingState | null;
  getJobId: (projectId: string) => string | null;
  isTracking: (projectId: string) => boolean;
}

// ─── Helper: Compute steps from server stage ─────────────────────

function computeSteps(
  serverStage: ProcessingStage,
  stageProgress: number
): ProcessingStep[] {
  const steps = createInitialSteps();
  const stageIndex = STAGE_ORDER.indexOf(serverStage);

  for (let i = 0; i < steps.length; i++) {
    const stepStageIndex = STAGE_ORDER.indexOf(steps[i].id);

    if (stepStageIndex < stageIndex) {
      steps[i].status = 'completed';
      steps[i].progress = 100;
      steps[i].completedAt = new Date().toISOString();
    } else if (stepStageIndex === stageIndex) {
      steps[i].status = 'active';
      steps[i].progress = stageProgress;
      steps[i].startedAt = new Date().toISOString();
    }
  }

  if (serverStage === 'completed') {
    steps.forEach((s) => {
      s.status = 'completed';
      s.progress = 100;
      s.completedAt = s.completedAt || new Date().toISOString();
    });
  } else if (serverStage === 'failed') {
    const activeStep = steps.find((s) => s.status === 'active');
    if (activeStep) {
      activeStep.status = 'error';
    }
  }

  return steps;
}

// ─── Store ───────────────────────────────────────────────────────

export const useProcessingStore = create<ProcessingState>((set, get) => ({
  activeJobs: new Map(),
  statuses: new Map(),

  startTracking: (projectId: string, jobId: string) => {
    set((state) => {
      const newJobs = new Map(state.activeJobs);
      newJobs.set(projectId, { jobId, projectId });

      const newStatuses = new Map(state.statuses);
      newStatuses.set(projectId, {
        status: 'processing',
        progress: 0,
        stage: 'queued',
        stageProgress: 0,
        message: 'Starting processing...',
        error: null,
        steps: createInitialSteps(),
        clips: [],
        startedAt: new Date().toISOString(),
        estimatedTimeRemaining: null,
      });

      return { activeJobs: newJobs, statuses: newStatuses };
    });
  },

  stopTracking: (projectId: string) => {
    set((state) => {
      const newJobs = new Map(state.activeJobs);
      newJobs.delete(projectId);
      return { activeJobs: newJobs };
    });
  },

  updateFromServer: (projectId: string, serverStatus: ProcessingStatus) => {
    set((state) => {
      const newStatuses = new Map(state.statuses);
      const steps = computeSteps(serverStatus.stage, serverStatus.stageProgress);

      newStatuses.set(projectId, {
        status: serverStatus.status,
        progress: serverStatus.progress,
        stage: serverStatus.stage,
        stageProgress: serverStatus.stageProgress,
        message: serverStatus.message,
        error: serverStatus.error,
        steps,
        clips: serverStatus.clips || [],
        startedAt: serverStatus.startedAt,
        estimatedTimeRemaining: serverStatus.estimatedTimeRemaining,
      });

      // On completion, save clips to clip store
      if (
        serverStatus.status === 'completed' &&
        serverStatus.clips &&
        serverStatus.clips.length > 0
      ) {
        useClipStore.getState().setClipsForProject(projectId, serverStatus.clips);
      }

      if (
        serverStatus.status === 'completed' ||
        serverStatus.status === 'failed'
      ) {
        const newJobs = new Map(state.activeJobs);
        newJobs.delete(projectId);
        return { statuses: newStatuses, activeJobs: newJobs };
      }

      return { statuses: newStatuses };
    });
  },

  setError: (projectId: string, error: string) => {
    set((state) => {
      const newStatuses = new Map(state.statuses);
      const current = newStatuses.get(projectId);

      if (current) {
        const steps = [...current.steps];
        const activeStep = steps.find((s) => s.status === 'active');
        if (activeStep) {
          activeStep.status = 'error';
        }

        newStatuses.set(projectId, {
          ...current,
          status: 'failed',
          error,
          steps,
        });
      } else {
        newStatuses.set(projectId, {
          status: 'failed',
          progress: 0,
          stage: 'failed',
          stageProgress: 0,
          message: 'Processing failed',
          error,
          steps: createInitialSteps(),
          clips: [],
          startedAt: null,
          estimatedTimeRemaining: null,
        });
      }

      const newJobs = new Map(state.activeJobs);
      newJobs.delete(projectId);

      return { statuses: newStatuses, activeJobs: newJobs };
    });
  },

  reset: (projectId: string) => {
    set((state) => {
      const newStatuses = new Map(state.statuses);
      newStatuses.delete(projectId);

      const newJobs = new Map(state.activeJobs);
      newJobs.delete(projectId);

      return { statuses: newStatuses, activeJobs: newJobs };
    });
  },

  getStatus: (projectId: string) => {
    return get().statuses.get(projectId) || null;
  },

  getJobId: (projectId: string) => {
    const job = get().activeJobs.get(projectId);
    return job?.jobId || null;
  },

  isTracking: (projectId: string) => {
    return get().activeJobs.has(projectId);
  },
}));
export type Theme = 'light' | 'dark';

// ─── Project Types ───────────────────────────────────────────────

export type ProjectStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface Project {
  id: string;
  videoUrl: string;
  title: string;
  thumbnailUrl: string;
  status: ProjectStatus;
  clipCount: number;
  duration: number;
  jobId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Processing Types ────────────────────────────────────────────

export type ProcessingStage =
  | 'queued'
  | 'fetching'
  | 'transcribing'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed';

export interface ProcessingStep {
  id: ProcessingStage;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProcessingStatus {
  jobId: string;
  projectId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  stage: ProcessingStage;
  stageProgress: number;
  message: string;
  error: string | null;
  clips: ClipData[];
  startedAt: string;
  estimatedTimeRemaining: number | null;
}

// ─── Clip Types ──────────────────────────────────────────────────

export interface ClipData {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  transcript: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailUrl: string;
  videoUrl: string;
  reason: string;
  score: number;
  order: number;
  captions: CaptionSegment[];
  fileSize?: number;
}

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

// ─── API Types ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface CreateProjectResponse {
  jobId: string;
  projectId: string;
}

export interface StartProcessingResponse {
  jobId: string;
  projectId: string;
  status: string;
}
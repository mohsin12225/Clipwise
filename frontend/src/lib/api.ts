import { API_BASE_URL } from '@/lib/constants';
import type {
  ApiResponse,
  CreateProjectResponse,
  StartProcessingResponse,
  ProcessingStatus,
  Project,
} from '@/types';

/**
 * Custom API error class with status code and structured info.
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Base fetch wrapper with error handling and typed responses.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message =
        errorBody?.error ||
        errorBody?.message ||
        errorBody?.detail ||
        `Request failed with status ${response.status}`;
      const code = errorBody?.code || `HTTP_${response.status}`;
      throw new ApiError(message, response.status, code);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Unable to connect to the server. Please check if the backend is running.',
      0,
      'NETWORK_ERROR'
    );
  }
}

// ─── Project Endpoints ───────────────────────────────────────────

export async function createProjectAPI(
  videoUrl: string
): Promise<ApiResponse<CreateProjectResponse>> {
  return request<ApiResponse<CreateProjectResponse>>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ videoUrl }),
  });
}

export async function fetchProjectsAPI(): Promise<ApiResponse<Project[]>> {
  return request<ApiResponse<Project[]>>('/api/projects');
}

export async function fetchProjectAPI(
  projectId: string
): Promise<ApiResponse<Project>> {
  return request<ApiResponse<Project>>(`/api/projects/${projectId}`);
}

export async function deleteProjectAPI(
  projectId: string
): Promise<ApiResponse<null>> {
  return request<ApiResponse<null>>(`/api/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// ─── Processing Endpoints ────────────────────────────────────────

/**
 * Starts processing a project. The backend will download the video,
 * transcribe, analyze, and generate clips.
 */
export async function startProcessingAPI(
  projectId: string,
  videoUrl: string
): Promise<ApiResponse<StartProcessingResponse>> {
  return request<ApiResponse<StartProcessingResponse>>('/api/process', {
    method: 'POST',
    body: JSON.stringify({ projectId, videoUrl }),
  });
}

/**
 * Polls the processing status for a given job.
 * This is called repeatedly until status is 'completed' or 'failed'.
 */
export async function getProcessingStatusAPI(
  jobId: string
): Promise<ApiResponse<ProcessingStatus>> {
  return request<ApiResponse<ProcessingStatus>>(`/api/status/${jobId}`);
}

/**
 * Retries a failed processing job.
 */
export async function retryProcessingAPI(
  projectId: string
): Promise<ApiResponse<StartProcessingResponse>> {
  return request<ApiResponse<StartProcessingResponse>>(
    `/api/process/${projectId}/retry`,
    { method: 'POST' }
  );
}
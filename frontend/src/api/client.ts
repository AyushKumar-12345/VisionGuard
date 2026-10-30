import axios from 'axios';
import {
  AnalyticsOverview,
  ClassDistributionItem,
  EvaluationRun,
  HealthStatus,
  JobCreatePayload,
  JobDetail,
  ModelConfig,
  VideoItem
} from '../types';

export const getBackendBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    const formatted = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    return formatted.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    const backendHost = window.location.hostname.replace('visionguard-frontend', 'visionguard-backend');
    return `https://${backendHost}`;
  }
  return '';
};

export const resolveMediaUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const API_BASE = `${getBackendBaseUrl()}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async (): Promise<HealthStatus> => {
  const res = await api.get<HealthStatus>('/health');
  if (typeof res.data !== 'object' || !res.data || !('status' in res.data)) {
    throw new Error('Invalid health response');
  }
  return res.data;
};

export const getVideos = async (): Promise<VideoItem[]> => {
  const res = await api.get<VideoItem[]>('/videos');
  return res.data;
};

export const uploadVideo = async (
  file: File,
  onUploadProgress?: (progress: number) => void
): Promise<VideoItem> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<VideoItem>('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    },
  });
  return res.data;
};

export const deleteVideo = async (videoId: string): Promise<void> => {
  await api.delete(`/videos/${videoId}`);
};

export const getModels = async (): Promise<ModelConfig[]> => {
  const res = await api.get<ModelConfig[]>('/models');
  return res.data;
};

export const createAnalysisJob = async (payload: JobCreatePayload): Promise<{ id: string; status: string }> => {
  const res = await api.post('/jobs', payload);
  return res.data;
};

export const getJobs = async (): Promise<JobDetail[]> => {
  const res = await api.get<JobDetail[]>('/jobs');
  return res.data;
};

export const getJobStatus = async (jobId: string): Promise<JobDetail> => {
  const res = await api.get<JobDetail>(`/jobs/${jobId}`);
  return res.data;
};

export const getJobResults = async (jobId: string): Promise<JobDetail> => {
  const res = await api.get<JobDetail>(`/jobs/${jobId}/results`);
  return res.data;
};

export const getAnalyticsOverview = async (): Promise<AnalyticsOverview> => {
  const res = await api.get<AnalyticsOverview>('/analytics/overview');
  return res.data;
};

export const getClassDistribution = async (): Promise<{ total: number; distribution: ClassDistributionItem[] }> => {
  const res = await api.get('/analytics/classes');
  return res.data;
};

export const getEvaluationRuns = async (): Promise<EvaluationRun[]> => {
  const res = await api.get<EvaluationRun[]>('/evaluations/runs');
  return res.data;
};

export const runEvaluation = async (modelName: string): Promise<EvaluationRun> => {
  const res = await api.post<EvaluationRun>('/evaluations/run', {
    model_name: modelName,
    conf_threshold: 0.25,
    iou_threshold: 0.50,
  });
  return res.data;
};

export const getModelComparison = async (): Promise<{
  dataset_name: string;
  runs: EvaluationRun[];
  summary_analysis: string;
}> => {
  const res = await api.get('/evaluations/compare');
  return res.data;
};

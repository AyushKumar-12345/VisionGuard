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

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async (): Promise<HealthStatus> => {
  const res = await api.get<HealthStatus>('/health');
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

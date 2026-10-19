import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Car,
  CheckCircle2,
  Cpu,
  Eye,
  RefreshCw,
  TrendingUp,
  UploadCloud,
  Video
} from 'lucide-react';
import { AnalyticsOverview, HealthStatus, JobDetail, VideoItem } from '../types';
import { uploadVideo } from '../api/client';

interface OverviewPageProps {
  overview: AnalyticsOverview | null;
  health: HealthStatus | null;
  videos: VideoItem[];
  recentJobs: JobDetail[];
  onNavigate: (tab: string, videoId?: string) => void;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  health,
  videos,
  recentJobs,
  onNavigate,
  onRefresh,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await uploadVideo(file, (p) => setUploadProgress(p));
      onRefresh();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload video');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome & Subheading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
            Traffic Intelligence & Multi-Model Intelligence Dashboard
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Real-time vehicle detection, ByteTrack tracking, virtual counting lines, and reproducible benchmark evaluations.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Videos Analyzed */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Videos Ingested</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">{videos.length || (overview?.total_videos_analyzed ?? 0)}</span>
            <span className="text-xs text-zinc-500">processed files</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">OpenCV metadata extracted and validated</p>
        </div>

        {/* Total Detections */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Raw Detections</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {(overview?.total_detections_recorded ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">bounding boxes</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">YOLO vehicle instances across all frames</p>
        </div>

        {/* Unique Tracked Vehicles */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Unique Vehicles</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {(overview?.total_unique_vehicles_tracked ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">unique tracks</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">ByteTrack multi-frame confirmed identities</p>
        </div>

        {/* Line Crossings */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Line Crossings</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-900">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950">
              {(overview?.total_line_crossings ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">events</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">2D vector cross-product debounced counts</p>
        </div>
      </div>

      {/* Middle Row: Hardware Diagnostics & Quick Ingest */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Diagnostics Card */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-950">Inference Hardware Diagnostics</h2>
          </div>
          <div className="space-y-3 text-xs text-zinc-700">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Processor</span>
              <span className="font-semibold text-zinc-900">{health?.environment.device_name || 'Intel Core Ultra 9 185H'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Inference Backend</span>
              <span className="font-semibold text-zinc-900">PyTorch {health?.environment.torch_version} ({health?.environment.device?.toUpperCase()})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">Intra-Op Threads</span>
              <span className="font-semibold text-zinc-900">{health?.environment.inference_threads} Cores Configured</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">System RAM</span>
              <span className="font-semibold text-zinc-900">
                {health?.system_resources.memory_used_gb} GB / {health?.system_resources.memory_total_gb} GB ({health?.system_resources.memory_free_gb} GB Free)
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500 font-medium">Database</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {health?.database}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Ingest Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-zinc-900" />
                <h2 className="text-base font-bold text-zinc-950">Quick Traffic Video Ingestion</h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                Max 200 MB
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Upload MP4, AVI, or MOV traffic footage. Uploads undergo binary signature inspection and OpenCV frame decoding verification.
            </p>
          </div>

          <div className="mt-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg p-6 cursor-pointer hover:border-zinc-900 transition-all bg-zinc-50 hover:bg-zinc-100">
              <UploadCloud className="w-8 h-8 text-zinc-400 mb-2" />
              <span className="text-sm font-semibold text-zinc-900">
                {uploading ? `Uploading... ${uploadProgress}%` : 'Select or drag traffic video here'}
              </span>
              <span className="text-xs text-zinc-500 mt-1">Supported: .mp4, .avi, .mov, .mkv</span>
              <input
                type="file"
                accept="video/mp4,video/x-msvideo,video/quicktime,video/x-matroska"
                onChange={handleQuickUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && (
              <div className="mt-3 w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-950 h-2 transition-all duration-200 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-red-600 mt-2 font-medium">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Analysis Jobs Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-950">Recent Video Analysis Pipelines</h2>
          </div>
          <button
            onClick={() => onNavigate('analysis')}
            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 flex items-center gap-1"
          >
            <span>Launch New Job</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Progress</th>
                <th className="px-6 py-3">Throughput</th>
                <th className="px-6 py-3">Elapsed</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                    No analysis jobs run yet. Navigate to <b>Live Analysis & Player</b> to run video inference.
                  </td>
                </tr>
              ) : (
                recentJobs.slice(0, 5).map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3.5 font-mono text-zinc-900 font-medium">
                      {job.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-zinc-900">
                      {job.model_name || 'yolov8n'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : job.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {job.progress_pct}%
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {job.processing_fps ? `${job.processing_fps} FPS` : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-500">
                      {job.processing_time_ms ? `${(job.processing_time_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onNavigate('analysis', job.video_id)}
                        className="text-xs font-semibold px-2.5 py-1 rounded bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
                      >
                        View Results
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

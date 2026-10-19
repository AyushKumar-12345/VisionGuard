import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Car,
  Download,
  Eye,
  FileText,
  Loader2,
  Play,
  Sliders,
  TrendingUp,
  Video
} from 'lucide-react';
import { JobDetail, ModelConfig, VideoItem } from '../types';
import { createAnalysisJob, getJobResults, getJobStatus } from '../api/client';

interface AnalysisPageProps {
  videos: VideoItem[];
  models: ModelConfig[];
  selectedVideoId?: string;
  onRefresh: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  videos,
  models,
  selectedVideoId,
  onRefresh,
}) => {
  const [videoId, setVideoId] = useState<string>(selectedVideoId || (videos[0]?.id ?? ''));
  const [modelName, setModelName] = useState<string>('yolov8n');
  const [confThresh, setConfThresh] = useState<number>(0.35);
  const [iouThresh, setIouThresh] = useState<number>(0.45);
  const [frameSkip, setFrameSkip] = useState<number>(1);

  // Virtual line coordinates (default: vertical line at center)
  const [lineName, setLineName] = useState<string>('Main Counting Line');
  const [startX, setStartX] = useState<number>(640);
  const [startY, setStartY] = useState<number>(100);
  const [endX, setEndX] = useState<number>(640);
  const [endY, setEndY] = useState<number>(680);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedVideoId) {
      setVideoId(selectedVideoId);
    } else if (videos.length > 0 && !videoId) {
      setVideoId(videos[0].id);
    }
  }, [selectedVideoId, videos]);

  // Polling for active job status
  useEffect(() => {
    if (!activeJobId) return;

    let timer: ReturnType<typeof setTimeout>;

    const pollStatus = async () => {
      try {
        const statusData = await getJobStatus(activeJobId);
        setJobDetail(statusData);

        if (statusData.status === 'COMPLETED') {
          // Fetch complete aggregated results
          const fullResults = await getJobResults(activeJobId);
          setJobDetail(fullResults);
          onRefresh();
        } else if (statusData.status === 'FAILED') {
          setErrorMsg(statusData.error_message || 'Video analysis pipeline encountered an error.');
        } else {
          timer = setTimeout(pollStatus, 1000);
        }
      } catch (err: any) {
        console.error('Failed to poll status', err);
      }
    };

    pollStatus();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId]);

  const handleLaunchJob = async () => {
    if (!videoId) {
      setErrorMsg('Please select a video to analyze.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setJobDetail(null);

    try {
      const res = await createAnalysisJob({
        video_id: videoId,
        model_name: modelName,
        conf_threshold: confThresh,
        iou_threshold: iouThresh,
        frame_skip: frameSkip,
        line_config: {
          name: lineName,
          start: { x: Number(startX), y: Number(startY) },
          end: { x: Number(endX), y: Number(endY) },
          direction_labels: ['Inbound', 'Outbound'],
        },
      });
      setActiveJobId(res.id);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start analysis job');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVideo = videos.find((v) => v.id === videoId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">
          Video Analysis Pipeline & Video Player
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Configure detection parameters, set virtual counting tripwires, and execute real YOLO inference with ByteTrack multi-object tracking.
        </p>
      </div>

      {/* Configuration & Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Sliders className="w-5 h-5 text-zinc-950" />
            <h2 className="text-base font-bold text-zinc-950">Inference Parameters</h2>
          </div>

          {/* Video Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Select Video
            </label>
            <select
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.original_filename} ({v.total_frames} frames, {v.width}x{v.height})
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Object Detection Model
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name.toUpperCase()} ({m.model_family} - {m.name === 'yolov8n' ? 'Fast, CPU Optimized ~35 FPS' : 'Higher Precision, ~15 FPS'})
                  </option>
                ))
              ) : (
                <>
                  <option value="yolov8n">YOLOv8 Nano (yolov8n - Fast, CPU Optimized ~35 FPS)</option>
                  <option value="yolov8s">YOLOv8 Small (yolov8s - Higher Precision, ~15 FPS)</option>
                </>
              )}
            </select>
          </div>

          {/* Threshold Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1">
                <span>Confidence Threshold</span>
                <span className="font-mono text-zinc-950">{confThresh}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confThresh}
                onChange={(e) => setConfThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1">
                <span>IoU NMS Threshold</span>
                <span className="font-mono text-zinc-950">{iouThresh}</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={iouThresh}
                onChange={(e) => setIouThresh(parseFloat(e.target.value))}
                className="w-full accent-zinc-950 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1">
                <span>Frame Sampling (Skip)</span>
                <span className="font-mono text-zinc-950">Every {frameSkip} frame</span>
              </div>
              <select
                value={frameSkip}
                onChange={(e) => setFrameSkip(parseInt(e.target.value, 10))}
                className="w-full text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-300 text-zinc-900"
              >
                <option value={1}>1 (Full Video - Analyze every frame)</option>
                <option value={2}>2 (Analyze every 2nd frame - 2x speed)</option>
                <option value={3}>3 (Analyze every 3rd frame - 3x speed)</option>
              </select>
            </div>
          </div>

          {/* Virtual Counting Line Configuration */}
          <div className="pt-2 border-t border-zinc-100 space-y-3">
            <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
              Virtual Counting Tripwire
            </span>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-0.5">Line Identifier</label>
              <input
                type="text"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded bg-zinc-50 border border-zinc-300 text-zinc-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-0.5">Start Point (X, Y)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={startX}
                    onChange={(e) => setStartX(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-zinc-50 border border-zinc-300 rounded text-center"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={startY}
                    onChange={(e) => setStartY(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-zinc-50 border border-zinc-300 rounded text-center"
                    placeholder="Y"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-0.5">End Point (X, Y)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={endX}
                    onChange={(e) => setEndX(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-zinc-50 border border-zinc-300 rounded text-center"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={endY}
                    onChange={(e) => setEndY(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-zinc-50 border border-zinc-300 rounded text-center"
                    placeholder="Y"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleLaunchJob}
            disabled={submitting || jobDetail?.status === 'PROCESSING'}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-950 text-white font-bold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {submitting || jobDetail?.status === 'PROCESSING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Video Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Launch Traffic Analysis</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Player and Execution Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress / Status Banner */}
          {jobDetail && (
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      jobDetail.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : jobDetail.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    {jobDetail.status}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">Job {jobDetail.id.substring(0, 8)}...</span>
                </div>
                <div className="text-xs text-zinc-700 font-medium">
                  {jobDetail.processing_fps ? `${jobDetail.processing_fps} FPS` : ''} | Frame {jobDetail.current_frame} / {jobDetail.total_frames}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-zinc-950 h-2.5 transition-all duration-300 rounded-full"
                  style={{ width: `${jobDetail.progress_pct}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Video Player Display */}
          <div className="bg-zinc-950 rounded-xl overflow-hidden shadow-lg border border-zinc-900 aspect-video flex flex-col items-center justify-center relative">
            {jobDetail?.status === 'COMPLETED' && jobDetail.annotated_video_url ? (
              <video
                src={jobDetail.annotated_video_url}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            ) : jobDetail?.status === 'PROCESSING' ? (
              <div className="flex flex-col items-center gap-3 text-white p-8">
                <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
                <span className="text-sm font-semibold tracking-wide">
                  Processing Video Frames ({jobDetail.progress_pct}%)...
                </span>
                <span className="text-xs text-zinc-400">
                  Executing YOLO inference, ByteTrack association, and video re-encoding
                </span>
              </div>
            ) : selectedVideo ? (
              <div className="flex flex-col items-center gap-2 text-zinc-400 p-8 text-center">
                <Video className="w-12 h-12 text-zinc-600 mb-2" />
                <span className="text-sm font-semibold text-zinc-200">{selectedVideo.original_filename}</span>
                <span className="text-xs text-zinc-500">
                  {selectedVideo.width} &times; {selectedVideo.height} | {selectedVideo.total_frames} Frames | Ready for analysis
                </span>
              </div>
            ) : (
              <div className="text-zinc-500 text-xs text-center p-8">
                No video loaded. Select a video from the library to preview and analyze.
              </div>
            )}
          </div>

          {/* Report Export Bar (Visible when completed) */}
          {jobDetail?.status === 'COMPLETED' && (
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <div>
                <span className="text-xs font-bold text-zinc-950 block">Analysis Complete</span>
                <span className="text-xs text-zinc-500">Export publication-grade reports for technical review</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/v1/reports/${jobDetail.id}/export?format=pdf`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Report</span>
                </a>
                <a
                  href={`/api/v1/reports/${jobDetail.id}/export?format=json`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-900 text-xs font-semibold hover:bg-zinc-50 transition-all shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Breakdown Section */}
      {jobDetail?.status === 'COMPLETED' && (
        <div className="space-y-6 pt-4 border-t border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-950 tracking-tight">
            Traffic Intelligence & Analytical Separation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: Raw Detections */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
                <span>Raw Detections</span>
                <Eye className="w-4 h-4 text-zinc-950" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-950">
                {jobDetail.detection_summary?.total_detections ?? 0}
              </div>
              <p className="text-xs text-zinc-500">
                Avg confidence: {((jobDetail.detection_summary?.average_confidence ?? 0) * 100).toFixed(1)}%
              </p>
            </div>

            {/* Metric 2: Unique Vehicles */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
                <span>Unique Tracked Vehicles</span>
                <Car className="w-4 h-4 text-zinc-950" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-950">
                {jobDetail.tracking_summary?.total_unique_tracks ?? 0}
              </div>
              <p className="text-xs text-zinc-500">
                Avg scene duration: {jobDetail.tracking_summary?.avg_track_duration_sec ?? 0}s
              </p>
            </div>

            {/* Metric 3: Virtual Line Crossings */}
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase">
                <span>Line Crossings</span>
                <TrendingUp className="w-4 h-4 text-zinc-950" />
              </div>
              <div className="text-3xl font-extrabold text-zinc-950">
                {jobDetail.tracking_summary?.total_line_crossings ?? 0}
              </div>
              <p className="text-xs text-zinc-500">
                In: {jobDetail.tracking_summary?.crossings_by_direction?.['Inbound'] ?? 0} | Out: {jobDetail.tracking_summary?.crossings_by_direction?.['Outbound'] ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

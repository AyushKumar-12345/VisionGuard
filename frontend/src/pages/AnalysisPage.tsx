import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Car,
  Crosshair,
  Download,
  Eye,
  FileText,
  Film,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sliders,
  TrendingUp
} from 'lucide-react';
import { JobDetail, ModelConfig, VideoItem } from '../types';
import { createAnalysisJob, getJobResults, getJobStatus } from '../api/client';

interface AnalysisPageProps {
  videos: VideoItem[];
  models?: ModelConfig[];
  selectedVideoId?: string;
  onRefresh: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  videos,
  models: _models,
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

  // Video Player Enhancements
  const [playerMode, setPlayerMode] = useState<'annotated' | 'raw'>('annotated');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTripwireOverlay, setShowTripwireOverlay] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isCalibratingPoints, setIsCalibratingPoints] = useState<'idle' | 'start' | 'end'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCalibratingPoints === 'idle' || !selectedVideo) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = (selectedVideo.width || 1280) / rect.width;
    const scaleY = (selectedVideo.height || 720) / rect.height;

    const clickX = Math.max(0, Math.min(selectedVideo.width || 1280, Math.round((e.clientX - rect.left) * scaleX)));
    const clickY = Math.max(0, Math.min(selectedVideo.height || 720, Math.round((e.clientY - rect.top) * scaleY)));

    if (isCalibratingPoints === 'start') {
      setStartX(clickX);
      setStartY(clickY);
      setIsCalibratingPoints('end');
    } else if (isCalibratingPoints === 'end') {
      setEndX(clickX);
      setEndY(clickY);
      setIsCalibratingPoints('idle');
    }
  };

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
          const fullResults = await getJobResults(activeJobId);
          setJobDetail(fullResults);
          setPlayerMode('annotated');
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

  // Synchronize playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, playerMode, activeJobId]);

  const handleLaunchJob = async () => {
    if (!videoId) {
      setErrorMsg('Please select a video from the library to analyze.');
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
    <div className="space-y-8 bg-white text-black">
      {/* Page Header */}
      <div className="pb-6 border-b-2 border-zinc-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300">
            Inference & Tracking Engine
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            ByteTrack Online Association
          </span>
        </div>
        <h1 className="text-3xl font-black text-black tracking-tight">
          Live Video Analysis Pipeline & Video Player
        </h1>
        <p className="text-sm font-semibold text-zinc-700 mt-1 max-w-3xl">
          Configure detection hyperparameters, position 2D vector virtual counting tripwires, execute anchor-free YOLO inference, and track vehicle trajectories in real time.
        </p>
      </div>

      {/* Configuration & Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Configuration Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border-2 border-zinc-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b-2 border-zinc-100">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-black">Pipeline Parameters</h2>
              <p className="text-xs font-semibold text-zinc-600">Model, thresholds, and spatial line</p>
            </div>
          </div>

          {/* Video Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Target Surveillance Video
            </label>
            <select
              value={videoId}
              onChange={(e) => {
                const nextId = e.target.value;
                setVideoId(nextId);
                setActiveJobId(null);
                setJobDetail(null);
                setPlayerMode('raw');
                setVideoError(null);
              }}
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-white border-2 border-zinc-200 text-black focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 shadow-xs"
            >
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.original_filename} ({v.total_frames} frames, {v.width}&times;{v.height})
                </option>
              ))}
            </select>
          </div>

          {/* Model Selector Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1.5">
              Object Detection Architecture
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setModelName('yolov8n')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  modelName === 'yolov8n'
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm shadow-blue-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-blue-700">YOLOv8 Nano</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold">Fast</span>
                </div>
                <p className="text-[11px] font-bold text-black">3.2M params &bull; ~35 FPS</p>
                <p className="text-[10px] font-semibold text-zinc-600">Edge CPU Optimized</p>
              </button>

              <button
                type="button"
                onClick={() => setModelName('yolov8s')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  modelName === 'yolov8s'
                    ? 'border-purple-600 bg-purple-50/50 shadow-sm shadow-purple-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-purple-700">YOLOv8 Small</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-extrabold">Precise</span>
                </div>
                <p className="text-[11px] font-bold text-black">11.2M params &bull; ~18 FPS</p>
                <p className="text-[10px] font-semibold text-zinc-600">Higher Precision mAP</p>
              </button>
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-black text-black mb-1.5">
                <span>Confidence Threshold</span>
                <span className="font-mono text-indigo-700 font-extrabold px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">
                  {confThresh}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confThresh}
                onChange={(e) => setConfThresh(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-zinc-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-black text-black mb-1.5">
                <span>IoU NMS Threshold</span>
                <span className="font-mono text-purple-700 font-extrabold px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
                  {iouThresh}
                </span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={iouThresh}
                onChange={(e) => setIouThresh(parseFloat(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer h-2 bg-zinc-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-black text-black mb-1.5">
                <span>Frame Sampling (Skip)</span>
                <span className="font-mono text-emerald-700 font-extrabold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                  Every {frameSkip} Frame
                </span>
              </div>
              <select
                value={frameSkip}
                onChange={(e) => setFrameSkip(parseInt(e.target.value, 10))}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border-2 border-zinc-200 text-black focus:outline-none focus:border-indigo-600"
              >
                <option value={1}>1 (Full Video - Analyze every frame)</option>
                <option value={2}>2 (Analyze every 2nd frame - 2x speed)</option>
                <option value={3}>3 (Analyze every 3rd frame - 3x speed)</option>
              </select>
            </div>
          </div>

          {/* Virtual Counting Line Configuration */}
          <div className="pt-4 border-t-2 border-zinc-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-black block">
                Virtual Counting Tripwire
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                2D Vector Cross Product
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-700 block mb-1">Line Label</label>
              <input
                type="text"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                className="w-full text-xs font-bold px-3 py-1.5 rounded-lg bg-white border-2 border-zinc-200 text-black"
              />
            </div>

            {/* Click-to-Position on Video button */}
            <button
              type="button"
              onClick={() => setIsCalibratingPoints(isCalibratingPoints === 'idle' ? 'start' : 'idle')}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                isCalibratingPoints !== 'idle'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30 ring-2 ring-amber-500 animate-pulse'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-black border-2 border-zinc-200 hover:border-indigo-500'
              }`}
            >
              <Crosshair className="w-4 h-4 text-indigo-600" />
              <span>
                {isCalibratingPoints === 'start'
                  ? '🎯 Step 1/2: Click on Video for START Point'
                  : isCalibratingPoints === 'end'
                  ? '🎯 Step 2/2: Click on Video for END Point'
                  : 'Click-To-Place Tripwire on Video'}
              </span>
            </button>

            {/* Quick Tripwire Presets */}
            <div>
              <span className="text-[11px] font-bold text-zinc-600 block mb-1.5">Quick Geometric Presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLineName('Midpoint Screen Line');
                    setStartX(640);
                    setStartY(0);
                    setEndX(640);
                    setEndY(720);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black text-[11px] font-bold text-left border border-zinc-200 transition-all cursor-pointer"
                >
                  Midpoint Vertical
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineName('Center Highway Gate');
                    setStartX(0);
                    setStartY(360);
                    setEndX(1280);
                    setEndY(360);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black text-[11px] font-bold text-left border border-zinc-200 transition-all cursor-pointer"
                >
                  Center Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineName('Inbound Left Lane');
                    setStartX(320);
                    setStartY(120);
                    setEndX(320);
                    setEndY(680);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black text-[11px] font-bold text-left border border-zinc-200 transition-all cursor-pointer"
                >
                  Inbound Left Lane
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineName('Outbound Right Lane');
                    setStartX(960);
                    setStartY(120);
                    setEndX(960);
                    setEndY(680);
                  }}
                  className="px-2 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black text-[11px] font-bold text-left border border-zinc-200 transition-all cursor-pointer"
                >
                  Outbound Right Lane
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200">
                <label className="text-[11px] font-extrabold text-cyan-900 block mb-1">Start (X, Y)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={startX}
                    onChange={(e) => setStartX(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-white border-2 border-zinc-200 rounded font-mono font-bold text-center"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={startY}
                    onChange={(e) => setStartY(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-white border-2 border-zinc-200 rounded font-mono font-bold text-center"
                    placeholder="Y"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <label className="text-[11px] font-extrabold text-amber-900 block mb-1">End (X, Y)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={endX}
                    onChange={(e) => setEndX(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-white border-2 border-zinc-200 rounded font-mono font-bold text-center"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={endY}
                    onChange={(e) => setEndY(parseInt(e.target.value, 10))}
                    className="w-1/2 px-2 py-1 bg-white border-2 border-zinc-200 rounded font-mono font-bold text-center"
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
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-black text-sm disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting || jobDetail?.status === 'PROCESSING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Executing Pipeline Inference...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white" />
                <span>Launch Traffic Analysis Pipeline</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-800 font-extrabold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Player and Execution Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress / Status Banner */}
          {jobDetail && (
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                      jobDetail.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-950 border-2 border-emerald-400'
                        : jobDetail.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-950 border-2 border-blue-400 animate-pulse'
                        : 'bg-zinc-100 text-black border-2 border-zinc-300'
                    }`}
                  >
                    {jobDetail.status}
                  </span>
                  <span className="text-xs text-zinc-700 font-mono font-bold">Pipeline ID: {jobDetail.id.substring(0, 8)}...</span>
                </div>
                <div className="text-xs font-extrabold text-black font-mono">
                  {jobDetail.processing_fps ? `${jobDetail.processing_fps.toFixed(1)} FPS` : ''} | Frame {jobDetail.current_frame} / {jobDetail.total_frames}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden border border-zinc-200">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-3 transition-all duration-300 rounded-full"
                  style={{ width: `${jobDetail.progress_pct}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Synchronized Video Player Section */}
          <div className="bg-white p-5 rounded-2xl border-2 border-zinc-200 shadow-sm space-y-3">
            {/* Player Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-zinc-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerMode('annotated');
                    setVideoError(null);
                  }}
                  disabled={!jobDetail || jobDetail.status !== 'COMPLETED' || !jobDetail.annotated_video_url}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    playerMode === 'annotated' && jobDetail?.status === 'COMPLETED'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Annotated AI Stream</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerMode('raw');
                    setVideoError(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    playerMode === 'raw' || !jobDetail || jobDetail.status !== 'COMPLETED'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Raw Video Stream</span>
                </button>
              </div>

              {/* Playback Controls & Speed */}
              <div className="flex items-center gap-3">
                {/* Tripwire Line Visual Overlay Toggle */}
                {selectedVideo && (
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showTripwireOverlay}
                      onChange={(e) => setShowTripwireOverlay(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Tripwire Overlay</span>
                  </label>
                )}

                {/* Speed Selector */}
                <div className="flex items-center gap-1 text-xs font-bold text-zinc-600">
                  <span className="hidden sm:inline">Speed:</span>
                  {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
                        playbackSpeed === rate
                          ? 'bg-black text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Restart Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play();
                    }
                  }}
                  className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-all cursor-pointer"
                  title="Restart stream from beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div
              onClick={handleVideoCanvasClick}
              className={`bg-zinc-950 rounded-2xl overflow-hidden shadow-md border-2 border-zinc-300 aspect-video flex flex-col items-center justify-center relative transition-all ${
                isCalibratingPoints !== 'idle' ? 'cursor-crosshair ring-4 ring-amber-400' : ''
              }`}
            >
              {/* Calibration Guide Banner */}
              {isCalibratingPoints !== 'idle' && (
                <div className="absolute top-3 left-3 z-30 px-3.5 py-1.5 rounded-xl bg-amber-400 text-black font-black text-xs shadow-lg flex items-center gap-2 animate-bounce">
                  <Crosshair className="w-4 h-4 text-black" />
                  <span>
                    {isCalibratingPoints === 'start'
                      ? 'Click video to set START anchor point'
                      : 'Click video to set END anchor point'}
                  </span>
                </div>
              )}
              {jobDetail?.status === 'PROCESSING' ? (
                <div className="flex flex-col items-center gap-3.5 text-black p-8 text-center bg-zinc-50 w-full h-full justify-center">
                  <div className="p-4 rounded-2xl bg-indigo-100 text-indigo-700">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  </div>
                  <span className="text-base font-black text-black">
                    Processing Surveillance Frames ({jobDetail.progress_pct}%)...
                  </span>
                  <span className="text-xs font-semibold text-zinc-600 max-w-md">
                    Executing YOLOv8 neural detection, ByteTrack two-stage Kalman filter tracking, virtual counting line intersection, and OpenCV annotated video re-encoding.
                  </span>
                </div>
              ) : selectedVideo ? (
                <>
                  <video
                    ref={videoRef}
                    key={`${playerMode}-${jobDetail?.id || videoId}`}
                    src={
                      playerMode === 'annotated' && jobDetail?.status === 'COMPLETED' && jobDetail.annotated_video_url
                        ? jobDetail.annotated_video_url
                        : selectedVideo.preview_url || `/media/uploads/${selectedVideo.id}.mp4`
                    }
                    controls
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    onError={(e) => {
                      console.error('Video stream error', e);
                      setVideoError('Unable to decode video format in this browser. Please verify H.264 codecs.');
                    }}
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Dynamic SVG Virtual Tripwire Overlay on Raw Video Stream */}
                  {showTripwireOverlay && (playerMode === 'raw' || !jobDetail || jobDetail.status !== 'COMPLETED') && (
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${selectedVideo.width || 1280} ${selectedVideo.height || 720}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="#00e5ff"
                        strokeWidth="5"
                        strokeDasharray="10 5"
                      />
                      <circle cx={startX} cy={startY} r="8" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx={endX} cy={endY} r="8" fill="#ec4899" stroke="#ffffff" strokeWidth="2.5" />
                      <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 12}
                        fill="#00e5ff"
                        fontSize="18"
                        fontWeight="900"
                        textAnchor="middle"
                        stroke="#000000"
                        strokeWidth="4"
                        paintOrder="stroke"
                      >
                        {lineName} [Tripwire]
                      </text>
                    </svg>
                  )}
                </>
              ) : (
                <div className="text-zinc-400 text-xs font-bold text-center p-8 bg-zinc-950 w-full h-full flex items-center justify-center">
                  No video loaded. Select a video from the library to configure and analyze.
                </div>
              )}

              {/* Error banner if browser failed to decode */}
              {videoError && (
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-rose-600/95 text-white text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{videoError}</span>
                  </div>
                  {selectedVideo && (
                    <a
                      href={selectedVideo.preview_url || `/media/uploads/${selectedVideo.id}.mp4`}
                      download
                      className="underline text-white font-black hover:text-zinc-200"
                    >
                      Download Video
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Report Export Bar (Visible when completed) */}
          {jobDetail?.status === 'COMPLETED' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border-2 border-zinc-200 shadow-sm">
              <div>
                <span className="text-sm font-black text-black block">Analysis Complete &bull; Publication Artifacts</span>
                <span className="text-xs font-semibold text-zinc-600">Export vector PDF intelligence report or raw JSON telemetry</span>
              </div>
              <div className="flex gap-2.5">
                <a
                  href={`/api/v1/reports/${jobDetail.id}/export?format=pdf`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all shadow-md shadow-rose-600/25"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download PDF Report</span>
                </a>
                <a
                  href={`/api/v1/reports/${jobDetail.id}/export?format=json`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/25"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Export JSON</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Breakdown Section */}
      {jobDetail?.status === 'COMPLETED' && (
        <div className="space-y-6 pt-6 border-t-2 border-zinc-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-black tracking-tight">
                Traffic Intelligence & Spatial Flow Breakdown
              </h2>
              <p className="text-xs font-semibold text-zinc-600">
                Ground-truth calibrated detections, Kalman filter trajectories, and directional line counts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Metric 1: Raw Detections */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-blue-600 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-700 text-xs font-black uppercase tracking-wider">
                <span>Raw YOLO Instances</span>
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-4xl font-black text-black">
                {jobDetail.detection_summary?.total_detections ?? 0}
              </div>
              <p className="text-xs font-bold text-blue-700">
                Mean Confidence Score: {((jobDetail.detection_summary?.average_confidence ?? 0) * 100).toFixed(1)}%
              </p>
            </div>

            {/* Metric 2: Unique Vehicles */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-purple-600 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-700 text-xs font-black uppercase tracking-wider">
                <span>Unique Tracked IDs</span>
                <Car className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-4xl font-black text-black">
                {jobDetail.tracking_summary?.total_unique_tracks ?? 0}
              </div>
              <p className="text-xs font-bold text-purple-700">
                Avg Track Duration: {jobDetail.tracking_summary?.avg_track_duration_sec ?? 0}s
              </p>
            </div>

            {/* Metric 3: Virtual Line Crossings */}
            <div className="bg-white p-6 rounded-2xl border-2 border-zinc-200 border-t-4 border-t-emerald-600 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-700 text-xs font-black uppercase tracking-wider">
                <span>Tripwire Crossings</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-4xl font-black text-black">
                {jobDetail.tracking_summary?.total_line_crossings ?? 0}
              </div>
              <div className="flex gap-3 text-xs font-extrabold pt-1">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                  Inbound: {jobDetail.tracking_summary?.crossings_by_direction?.['Inbound'] ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                  Outbound: {jobDetail.tracking_summary?.crossings_by_direction?.['Outbound'] ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

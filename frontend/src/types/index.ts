export interface VideoItem {
  id: string;
  preview_url?: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  file_hash_sha256: string;
  fps: number;
  width: number;
  height: number;
  total_frames: number;
  duration_seconds: number;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  model_family: string;
  weight_identifier: string;
  input_size: number;
  default_conf: number;
  default_iou: number;
  is_active: boolean;
  created_at: string;
}

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineConfig {
  name: string;
  start: LinePoint;
  end: LinePoint;
  direction_labels: [string, string];
}

export interface JobCreatePayload {
  video_id: string;
  model_name: string;
  conf_threshold: number;
  iou_threshold: number;
  frame_skip: number;
  line_config?: LineConfig;
}

export interface DetectionSummary {
  total_detections: number;
  counts_by_class: Record<string, number>;
  average_confidence: number;
}

export interface TrackingSummary {
  total_unique_tracks: number;
  tracks_by_class: Record<string, number>;
  avg_track_duration_sec: number;
  total_line_crossings: number;
  crossings_by_direction: Record<string, number>;
  crossings_by_class: Record<string, number>;
}

export interface TrafficInterval {
  interval_start_sec: number;
  interval_end_sec: number;
  vehicle_count: number;
  counts_by_class: Record<string, number>;
  avg_density: number;
}

export interface JobDetail {
  id: string;
  video_id: string;
  model_name?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress_pct: number;
  current_frame: number;
  total_frames: number;
  processing_fps: number;
  processing_time_ms: number;
  error_message?: string;
  annotated_video_url?: string;
  detection_summary?: DetectionSummary;
  tracking_summary?: TrackingSummary;
  traffic_intervals: TrafficInterval[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface AnalyticsOverview {
  total_videos_analyzed: number;
  total_detections_recorded: number;
  total_unique_vehicles_tracked: number;
  total_line_crossings: number;
  active_jobs_count: number;
}

export interface ClassDistributionItem {
  class_name: string;
  count: number;
  percentage: number;
}

export interface EvaluationRun {
  id: string;
  dataset_id: string;
  model_config_id: string;
  model_name?: string;
  status: string;
  conf_threshold: number;
  iou_threshold: number;
  input_size: number;
  device: string;
  precision?: number;
  recall?: number;
  map50?: number;
  map50_95?: number;
  f1_score?: number;
  latency_ms?: number;
  throughput_fps?: number;
  class_metrics?: Record<string, {
    precision: number;
    recall: number;
    f1: number;
    ap50: number;
    tp: number;
    fp: number;
    fn: number;
  }>;
  hardware_info?: {
    cpu: string;
    cores: number;
    logical_threads: number;
    threads_configured: number;
    ram_total_gb: number;
  };
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface HealthStatus {
  status: string;
  project: string;
  version: string;
  database: string;
  environment: {
    python_version: string;
    torch_version: string;
    device: string;
    device_name: string;
    inference_threads: number;
  };
  system_resources: {
    cpu_usage_pct: number;
    memory_used_gb: number;
    memory_total_gb: number;
    memory_free_gb: number;
  };
}


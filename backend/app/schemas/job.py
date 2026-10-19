from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Point2D(BaseModel):
    x: float = Field(..., description="X coordinate (pixel or normalized 0.0 - 1.0)")
    y: float = Field(..., description="Y coordinate (pixel or normalized 0.0 - 1.0)")


class LineConfig(BaseModel):
    name: str = Field(default="Main Counting Line", description="Name of the virtual counting line")
    start: Point2D = Field(..., description="Starting point (A) of the line")
    end: Point2D = Field(..., description="Ending point (B) of the line")
    direction_labels: list[str] | None = Field(
        default=["Inbound", "Outbound"],
        description="Labels for crossing directions based on vector cross-product sign"
    )


class JobCreate(BaseModel):
    video_id: str
    model_name: str | None = Field(default="yolov8n", description="Model name (e.g. yolov8n or yolov8s)")
    model_config_id: str | None = None
    conf_threshold: float = Field(default=0.35, ge=0.05, le=0.95)
    iou_threshold: float = Field(default=0.45, ge=0.10, le=0.95)
    frame_skip: int = Field(default=1, ge=1, le=10, description="Process every Nth frame (1 = full video)")
    line_config: LineConfig | None = None


class JobStatusResponse(BaseModel):
    id: str
    video_id: str
    model_name: str | None = None
    status: str
    progress_pct: float
    current_frame: int
    total_frames: int
    processing_fps: float
    processing_time_ms: int
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DetectionSummarySchema(BaseModel):
    total_detections: int
    counts_by_class: dict[str, int]
    average_confidence: float

    model_config = ConfigDict(from_attributes=True)


class TrackingSummarySchema(BaseModel):
    total_unique_tracks: int
    tracks_by_class: dict[str, int]
    avg_track_duration_sec: float
    total_line_crossings: int
    crossings_by_direction: dict[str, int]
    crossings_by_class: dict[str, int]

    model_config = ConfigDict(from_attributes=True)


class TrafficIntervalSchema(BaseModel):
    interval_start_sec: float
    interval_end_sec: float
    vehicle_count: int
    counts_by_class: dict[str, int]
    avg_density: float

    model_config = ConfigDict(from_attributes=True)


class JobDetailResponse(JobStatusResponse):
    annotated_video_url: str | None = None
    detection_summary: DetectionSummarySchema | None = None
    tracking_summary: TrackingSummarySchema | None = None
    traffic_intervals: list[TrafficIntervalSchema] = []

    model_config = ConfigDict(from_attributes=True)

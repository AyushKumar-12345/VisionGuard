from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EvaluationDatasetResponse(BaseModel):
    id: str
    name: str
    version: str
    split: str
    num_samples: int
    num_ground_truth_boxes: int
    license: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvaluationRunCreate(BaseModel):
    model_name: str = Field(default="yolov8n", description="Candidate model name (e.g. yolov8n or yolov8s)")
    dataset_id: str | None = None
    conf_threshold: float = Field(default=0.25, ge=0.01, le=0.99)
    iou_threshold: float = Field(default=0.50, ge=0.10, le=0.95)
    input_size: int = Field(default=640)


class EvaluationRunResponse(BaseModel):
    id: str
    dataset_id: str
    model_config_id: str
    model_name: str | None = None
    status: str
    conf_threshold: float
    iou_threshold: float
    input_size: int
    device: str
    precision: float | None = None
    recall: float | None = None
    map50: float | None = None
    map50_95: float | None = None
    f1_score: float | None = None
    latency_ms: float | None = None
    throughput_fps: float | None = None
    class_metrics: dict[str, Any] | None = None
    hardware_info: dict[str, Any] | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModelComparisonResponse(BaseModel):
    dataset_name: str
    total_ground_truth_samples: int
    runs: list[EvaluationRunResponse]
    summary_analysis: str

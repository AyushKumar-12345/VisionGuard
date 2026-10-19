import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ModelConfig(Base):
    """Configuration record for an object detection model."""
    __tablename__ = "model_configs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    model_family: Mapped[str] = mapped_column(String(64), nullable=False, default="YOLOv8")
    weight_identifier: Mapped[str] = mapped_column(String(128), nullable=False)
    weight_file_path: Mapped[str] = mapped_column(Text, nullable=False)
    input_size: Mapped[int] = mapped_column(Integer, nullable=False, default=640)
    default_conf: Mapped[float] = mapped_column(Float, nullable=False, default=0.35)
    default_iou: Mapped[float] = mapped_column(Float, nullable=False, default=0.45)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    jobs: Mapped[list["AnalysisJob"]] = relationship(
        "AnalysisJob",
        back_populates="model_config"
    )
    evaluation_runs: Mapped[list["EvaluationRun"]] = relationship(
        "EvaluationRun",
        back_populates="model_config"
    )


class AnalysisJob(Base):
    """Tracks asynchronous execution of video analysis pipeline."""
    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    video_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    model_config_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("model_configs.id"),
        nullable=False
    )

    # Execution state: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING", index=True)
    progress_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    current_frame: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_frames: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processing_fps: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Parameters & Output
    conf_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.35)
    iou_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.45)
    frame_skip: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    annotated_video_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    line_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    video: Mapped["Video"] = relationship("Video", back_populates="jobs")
    model_config: Mapped["ModelConfig"] = relationship("ModelConfig", back_populates="jobs")
    detection_summary: Mapped[Optional["DetectionSummary"]] = relationship(
        "DetectionSummary",
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    tracking_summary: Mapped[Optional["TrackingSummary"]] = relationship(
        "TrackingSummary",
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    traffic_intervals: Mapped[list["TrafficInterval"]] = relationship(
        "TrafficInterval",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class DetectionSummary(Base):
    """Aggregated raw detection metrics for an analysis job."""
    __tablename__ = "detection_summaries"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("analysis_jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    total_detections: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    counts_by_class: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    average_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    job: Mapped["AnalysisJob"] = relationship("AnalysisJob", back_populates="detection_summary")


class TrackingSummary(Base):
    """Aggregated multi-object tracking and counting-line metrics."""
    __tablename__ = "tracking_summaries"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("analysis_jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    total_unique_tracks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tracks_by_class: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    avg_track_duration_sec: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Line crossing results
    total_line_crossings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crossings_by_direction: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    crossings_by_class: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)

    job: Mapped["AnalysisJob"] = relationship("AnalysisJob", back_populates="tracking_summary")


class TrafficInterval(Base):
    """Time-sliced traffic counts and density estimates."""
    __tablename__ = "traffic_intervals"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("analysis_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    interval_start_sec: Mapped[float] = mapped_column(Float, nullable=False)
    interval_end_sec: Mapped[float] = mapped_column(Float, nullable=False)
    vehicle_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    counts_by_class: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    avg_density: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    job: Mapped["AnalysisJob"] = relationship("AnalysisJob", back_populates="traffic_intervals")

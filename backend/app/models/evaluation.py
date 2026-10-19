import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EvaluationDataset(Base):
    """Stores metadata for labeled ground-truth evaluation datasets."""
    __tablename__ = "evaluation_datasets"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0")
    split: Mapped[str] = mapped_column(String(32), nullable=False, default="val")
    num_samples: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    num_ground_truth_boxes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dataset_path: Mapped[str] = mapped_column(Text, nullable=False)
    license: Mapped[str] = mapped_column(String(128), nullable=False, default="CC-BY-4.0")

    runs: Mapped[list["EvaluationRun"]] = relationship(
        "EvaluationRun",
        back_populates="dataset",
        cascade="all, delete-orphan"
    )


class EvaluationRun(Base):
    """Stores reproducible evaluation run benchmarks for a model on a dataset."""
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    dataset_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("evaluation_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    model_config_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("model_configs.id"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    conf_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.25)
    iou_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=0.50)
    input_size: Mapped[int] = mapped_column(Integer, nullable=False, default=640)
    device: Mapped[str] = mapped_column(String(32), nullable=False, default="cpu")

    # Metrics
    precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    map50: Mapped[float | None] = mapped_column(Float, nullable=True)
    map50_95: Mapped[float | None] = mapped_column(Float, nullable=True)
    f1_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    throughput_fps: Mapped[float | None] = mapped_column(Float, nullable=True)

    class_metrics: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    hardware_info: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    dataset: Mapped["EvaluationDataset"] = relationship("EvaluationDataset", back_populates="runs")
    model_config: Mapped["ModelConfig"] = relationship("ModelConfig", back_populates="evaluation_runs")

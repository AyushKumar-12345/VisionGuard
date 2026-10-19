import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Video(Base):
    """Stores metadata for uploaded traffic video files."""
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # Video properties extracted via OpenCV
    fps: Mapped[float] = mapped_column(Float, nullable=False, default=30.0)
    width: Mapped[int] = mapped_column(Integer, nullable=False, default=1920)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=1080)
    total_frames: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Ingestion status: 'READY', 'PROCESSING', 'FAILED'
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="READY")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationship to analysis jobs
    jobs: Mapped[list["AnalysisJob"]] = relationship(
        "AnalysisJob",
        back_populates="video",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

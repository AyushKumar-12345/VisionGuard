from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VideoBase(BaseModel):
    original_filename: str
    file_size_bytes: int
    mime_type: str


class VideoMetadata(BaseModel):
    fps: float
    width: int
    height: int
    total_frames: int
    duration_seconds: float


class VideoCreate(VideoBase):
    storage_path: str
    file_hash_sha256: str
    fps: float
    width: int
    height: int
    total_frames: int
    duration_seconds: float


class VideoResponse(VideoBase):
    id: str
    file_hash_sha256: str
    fps: float
    width: int
    height: int
    total_frames: int
    duration_seconds: float
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

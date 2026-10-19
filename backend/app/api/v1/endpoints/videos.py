import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.db.session import get_db
from app.models.video import Video
from app.schemas.video import VideoResponse
from app.services.cv.video_validator import (
    VideoValidationError,
    compute_sha256,
    extract_video_metadata,
    validate_magic_bytes,
)

router = APIRouter()


@router.post("/upload", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    file: UploadFile,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests and validates a traffic video file.

    Security & Reliability:
    - Validates file extension against permitted list.
    - Inspects binary magic bytes (rejects disguised executables).
    - Checks file size against MAX_UPLOAD_SIZE_BYTES ceiling.
    - Assigns UUID filename to prevent directory traversal attacks.
    - Incremental streaming write to prevent server RAM spikes.
    - Extracts OpenCV metadata and confirms initial frame decode.
    """
    original_filename = file.filename or "uploaded_video.mp4"
    file_ext = Path(original_filename).suffix.lower()

    if file_ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. Permitted extensions: {', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}"
        )

    # Generate unique UUID-based destination path
    unique_id = str(uuid.uuid4())
    stored_filename = f"{unique_id}{file_ext}"
    dest_path = settings.UPLOAD_DIR / stored_filename

    # Stream write to disk while tracking size
    total_bytes = 0
    try:
        with open(dest_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB buffer
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    buffer.close()
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Video exceeds the {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB size limit."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        logger.error(f"Failed during file upload streaming: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving upload stream: {e!s}"
        )

    # 1. Magic bytes validation
    try:
        detected_mime = validate_magic_bytes(dest_path)
    except VideoValidationError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # 2. SHA-256 computation
    file_hash = compute_sha256(dest_path)

    # 3. OpenCV frame decode & metadata extraction
    try:
        metadata = extract_video_metadata(dest_path)
    except VideoValidationError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

    # 4. Persist Video entity to DB
    video = Video(
        id=unique_id,
        original_filename=original_filename,
        storage_path=str(dest_path),
        file_size_bytes=total_bytes,
        mime_type=detected_mime,
        file_hash_sha256=file_hash,
        fps=metadata["fps"],
        width=metadata["width"],
        height=metadata["height"],
        total_frames=metadata["total_frames"],
        duration_seconds=metadata["duration_seconds"],
        status="READY"
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    logger.info(f"Video uploaded successfully: {video.original_filename} ({video.id}), {metadata['total_frames']} frames")
    return video


@router.get("", response_model=list[VideoResponse])
async def list_videos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Lists uploaded video records with optional status filtering."""
    query = select(Video).order_by(desc(Video.created_at)).offset(skip).limit(limit)
    if status_filter:
        query = query.where(Video.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetches details for a single video."""
    query = select(Video).where(Video.id == video_id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return video


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deletes a video record and removes associated filesystem files."""
    query = select(Video).where(Video.id == video_id)
    result = await db.execute(query)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")

    # Remove storage file
    try:
        Path(video.storage_path).unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"Could not delete physical video file: {e}")

    # Remove associated annotated videos for this video's jobs
    for job in video.jobs:
        if job.annotated_video_path:
            try:
                Path(job.annotated_video_path).unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"Could not delete physical annotated video file: {e}")

    await db.delete(video)
    await db.commit()
    logger.info(f"Video {video_id} and associated assets deleted.")

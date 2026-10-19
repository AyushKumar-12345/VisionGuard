import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import logger
from app.db.session import get_db
from app.models.analysis import AnalysisJob, ModelConfig
from app.models.video import Video
from app.schemas.job import (
    DetectionSummarySchema,
    JobCreate,
    JobDetailResponse,
    JobStatusResponse,
    TrackingSummarySchema,
    TrafficIntervalSchema,
)
from app.services.cv.pipeline import run_analysis_pipeline

router = APIRouter()

# Semaphore to bound concurrent video processing jobs
job_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_JOBS)


async def _run_job_with_semaphore(job_id: str):
    async with job_semaphore:
        await run_analysis_pipeline(job_id)


@router.post("", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis_job(
    payload: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a video for asynchronous multi-model computer vision analysis.

    Validates:
    - Video exists and is READY.
    - Model exists and is active.
    - Configures confidence, IoU, and virtual counting line parameters.
    - Queues processing task without blocking API.
    """
    # 1. Verify Video
    video_query = select(Video).where(Video.id == payload.video_id)
    video_res = await db.execute(video_query)
    video = video_res.scalar_one_or_none()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video '{payload.video_id}' not found."
        )

    # 2. Resolve Model Configuration
    if payload.model_config_id:
        model_query = select(ModelConfig).where(ModelConfig.id == payload.model_config_id)
    else:
        model_query = select(ModelConfig).where(ModelConfig.name == payload.model_name)

    model_res = await db.execute(model_query)
    model_cfg = model_res.scalar_one_or_none()
    if not model_cfg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{payload.model_name or payload.model_config_id}' not found."
        )

    # 3. Create Job Record
    job = AnalysisJob(
        video_id=video.id,
        model_config_id=model_cfg.id,
        status="PENDING",
        conf_threshold=payload.conf_threshold,
        iou_threshold=payload.iou_threshold,
        frame_skip=payload.frame_skip,
        line_config=payload.line_config.model_dump() if payload.line_config else None,
        total_frames=video.total_frames
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # 4. Enqueue Asynchronous Background Processing
    background_tasks.add_task(_run_job_with_semaphore, job.id)
    logger.info(f"Queued analysis job {job.id} for video {video.original_filename} using {model_cfg.name}")

    return JobStatusResponse(
        id=job.id,
        video_id=job.video_id,
        model_name=model_cfg.name,
        status=job.status,
        progress_pct=job.progress_pct,
        current_frame=job.current_frame,
        total_frames=job.total_frames,
        processing_fps=job.processing_fps,
        processing_time_ms=job.processing_time_ms,
        created_at=job.created_at
    )


@router.get("", response_model=list[JobStatusResponse])
async def list_jobs(
    video_id: str | None = None,
    status_filter: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lists analysis jobs with optional filtering."""
    query = (
        select(AnalysisJob)
        .options(selectinload(AnalysisJob.model_config))
        .order_by(desc(AnalysisJob.created_at))
        .offset(skip)
        .limit(limit)
    )
    if video_id:
        query = query.where(AnalysisJob.video_id == video_id)
    if status_filter:
        query = query.where(AnalysisJob.status == status_filter)

    result = await db.execute(query)
    jobs = result.scalars().all()

    return [
        JobStatusResponse(
            id=j.id,
            video_id=j.video_id,
            model_name=j.model_config.name if j.model_config else None,
            status=j.status,
            progress_pct=j.progress_pct,
            current_frame=j.current_frame,
            total_frames=j.total_frames,
            processing_fps=j.processing_fps,
            processing_time_ms=j.processing_time_ms,
            error_message=j.error_message,
            started_at=j.started_at,
            completed_at=j.completed_at,
            created_at=j.created_at
        )
        for j in jobs
    ]


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetches real-time status and progress for an analysis job."""
    query = (
        select(AnalysisJob)
        .options(selectinload(AnalysisJob.model_config))
        .where(AnalysisJob.id == job_id)
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobStatusResponse(
        id=job.id,
        video_id=job.video_id,
        model_name=job.model_config.name if job.model_config else None,
        status=job.status,
        progress_pct=job.progress_pct,
        current_frame=job.current_frame,
        total_frames=job.total_frames,
        processing_fps=job.processing_fps,
        processing_time_ms=job.processing_time_ms,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at
    )


@router.get("/{job_id}/results", response_model=JobDetailResponse)
async def get_job_results(job_id: str, db: AsyncSession = Depends(get_db)):
    """Fetches comprehensive results, detection summaries, and traffic analytics."""
    query = (
        select(AnalysisJob)
        .options(
            selectinload(AnalysisJob.model_config),
            selectinload(AnalysisJob.detection_summary),
            selectinload(AnalysisJob.tracking_summary),
            selectinload(AnalysisJob.traffic_intervals)
        )
        .where(AnalysisJob.id == job_id)
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    video_url = f"/media/annotated/annotated_{job.id}.mp4" if job.annotated_video_path else None

    return JobDetailResponse(
        id=job.id,
        video_id=job.video_id,
        model_name=job.model_config.name if job.model_config else None,
        status=job.status,
        progress_pct=job.progress_pct,
        current_frame=job.current_frame,
        total_frames=job.total_frames,
        processing_fps=job.processing_fps,
        processing_time_ms=job.processing_time_ms,
        error_message=job.error_message,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        annotated_video_url=video_url,
        detection_summary=DetectionSummarySchema.model_validate(job.detection_summary) if job.detection_summary else None,
        tracking_summary=TrackingSummarySchema.model_validate(job.tracking_summary) if job.tracking_summary else None,
        traffic_intervals=[
            TrafficIntervalSchema.model_validate(ti) for ti in job.traffic_intervals
        ]
    )

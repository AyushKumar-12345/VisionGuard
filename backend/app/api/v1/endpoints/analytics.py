
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.analysis import AnalysisJob, DetectionSummary, TrackingSummary
from app.models.video import Video
from app.schemas.analytics import (
    AnalyticsOverview,
    ClassDistribution,
    TrafficDistributionResponse,
)

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Computes overall intelligence statistics across all processed traffic videos."""
    # Count videos
    video_count_stmt = select(func.count(Video.id))
    video_res = await db.execute(video_count_stmt)
    total_videos = video_res.scalar() or 0

    # Total raw detections
    det_stmt = select(func.sum(DetectionSummary.total_detections))
    det_res = await db.execute(det_stmt)
    total_detections = det_res.scalar() or 0

    # Total unique vehicles tracked
    track_stmt = select(func.sum(TrackingSummary.total_unique_tracks))
    track_res = await db.execute(track_stmt)
    total_unique_tracks = track_res.scalar() or 0

    # Total line crossings
    cross_stmt = select(func.sum(TrackingSummary.total_line_crossings))
    cross_res = await db.execute(cross_stmt)
    total_crossings = cross_res.scalar() or 0

    # Active processing jobs
    active_stmt = select(func.count(AnalysisJob.id)).where(AnalysisJob.status == "PROCESSING")
    active_res = await db.execute(active_stmt)
    active_jobs = active_res.scalar() or 0

    return AnalyticsOverview(
        total_videos_analyzed=total_videos,
        total_detections_recorded=int(total_detections),
        total_unique_vehicles_tracked=int(total_unique_tracks),
        total_line_crossings=int(total_crossings),
        active_jobs_count=int(active_jobs)
    )


@router.get("/classes", response_model=TrafficDistributionResponse)
async def get_class_distribution(db: AsyncSession = Depends(get_db)):
    """Computes aggregate distribution of vehicle classes across all unique tracked vehicles."""
    query = select(TrackingSummary.tracks_by_class)
    result = await db.execute(query)
    all_class_dicts = result.scalars().all()

    totals: dict[str, int] = {}
    total_count = 0
    for d in all_class_dicts:
        if isinstance(d, dict):
            for cls_name, count in d.items():
                totals[cls_name] = totals.get(cls_name, 0) + count
                total_count += count

    distribution: list[ClassDistribution] = []
    for cls_name, count in totals.items():
        pct = round((count / total_count * 100), 1) if total_count > 0 else 0.0
        distribution.append(
            ClassDistribution(
                class_name=cls_name,
                count=count,
                percentage=pct
            )
        )

    return TrafficDistributionResponse(
        total=total_count,
        distribution=sorted(distribution, key=lambda x: x.count, reverse=True)
    )

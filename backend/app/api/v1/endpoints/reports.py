from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.analysis import AnalysisJob
from app.services.reporting import generate_traffic_pdf

router = APIRouter()


@router.get("/{job_id}/export")
async def export_job_report(
    job_id: str,
    format: str = Query("json", pattern="^(json|pdf)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports a comprehensive traffic intelligence report in JSON or PDF format.
    """
    stmt = (
        select(AnalysisJob)
        .options(
            selectinload(AnalysisJob.video),
            selectinload(AnalysisJob.model_config),
            selectinload(AnalysisJob.detection_summary),
            selectinload(AnalysisJob.tracking_summary),
            selectinload(AnalysisJob.traffic_intervals)
        )
        .where(AnalysisJob.id == job_id)
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found")

    report_payload = {
        "job_id": job.id,
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "status": job.status,
        "model_name": job.model_config.name if job.model_config else "N/A",
        "conf_threshold": job.conf_threshold,
        "iou_threshold": job.iou_threshold,
        "processing_fps": job.processing_fps,
        "processing_time_ms": job.processing_time_ms,
        "video": {
            "filename": job.video.original_filename if job.video else "N/A",
            "fps": job.video.fps if job.video else 0.0,
            "width": job.video.width if job.video else 0,
            "height": job.video.height if job.video else 0,
            "total_frames": job.video.total_frames if job.video else 0,
            "duration_seconds": job.video.duration_seconds if job.video else 0.0,
        },
        "detection_summary": {
            "total_detections": job.detection_summary.total_detections if job.detection_summary else 0,
            "counts_by_class": job.detection_summary.counts_by_class if job.detection_summary else {},
            "average_confidence": job.detection_summary.average_confidence if job.detection_summary else 0.0,
        },
        "tracking_summary": {
            "total_unique_tracks": job.tracking_summary.total_unique_tracks if job.tracking_summary else 0,
            "tracks_by_class": job.tracking_summary.tracks_by_class if job.tracking_summary else {},
            "avg_track_duration_sec": job.tracking_summary.avg_track_duration_sec if job.tracking_summary else 0.0,
            "total_line_crossings": job.tracking_summary.total_line_crossings if job.tracking_summary else 0,
            "crossings_by_direction": job.tracking_summary.crossings_by_direction if job.tracking_summary else {},
            "crossings_by_class": job.tracking_summary.crossings_by_class if job.tracking_summary else {},
        },
        "traffic_intervals": [
            {
                "interval_start_sec": ti.interval_start_sec,
                "interval_end_sec": ti.interval_end_sec,
                "vehicle_count": ti.vehicle_count,
                "counts_by_class": ti.counts_by_class,
                "avg_density": ti.avg_density
            }
            for ti in job.traffic_intervals
        ],
        "disclaimer": "Speed estimates are omitted due to absence of homography calibration. Metrics distinguish raw detections, unique tracks, and counting-line crossings."
    }

    if format == "json":
        return JSONResponse(content=report_payload)

    # PDF format
    pdf_filename = f"report_{job.id}.pdf"
    pdf_path = settings.REPORTS_DIR / pdf_filename
    generate_traffic_pdf(report_payload, pdf_path)

    return FileResponse(
        path=str(pdf_path),
        filename=f"VisionGuard_Report_{job.id[:8]}.pdf",
        media_type="application/pdf"
    )

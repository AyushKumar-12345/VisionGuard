import asyncio
import time
from datetime import UTC, datetime

import cv2
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import logger
from app.db import session as db_session
from app.models.analysis import (
    AnalysisJob,
    DetectionSummary,
    ModelConfig,
    TrackingSummary,
    TrafficInterval,
)
from app.models.video import Video
from app.services.cv.annotator import FrameAnnotator
from app.services.cv.detector import (
    TRAFFIC_CLASS_IDS,
    TRAFFIC_CLASS_NAMES,
    ModelRegistry,
)
from app.services.cv.line_counter import LineSegment, Point, VirtualLineCounter


async def run_analysis_pipeline(job_id: str) -> None:
    """
    Main asynchronous video processing entry point.
    Runs the incremental detection, tracking, line crossing, and annotation pipeline.
    """
    async with db_session.async_session_factory() as session:
        # Load job details
        stmt = (
            select(AnalysisJob)
            .where(AnalysisJob.id == job_id)
        )
        res = await session.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            logger.error(f"Analysis job {job_id} not found.")
            return

        # Load associated video and model configuration
        video_stmt = select(Video).where(Video.id == job.video_id)
        video_res = await session.execute(video_stmt)
        video = video_res.scalar_one_or_none()

        model_stmt = select(ModelConfig).where(ModelConfig.id == job.model_config_id)
        model_res = await session.execute(model_stmt)
        model_cfg = model_res.scalar_one_or_none()

        if not video or not model_cfg:
            job.status = "FAILED"
            job.error_message = "Associated Video or ModelConfig was not found."
            await session.commit()
            return

        # Transition job to PROCESSING
        job.status = "PROCESSING"
        job.started_at = datetime.now(UTC)
        await session.commit()

    # Run CPU/GPU heavy pipeline in a separate thread so asyncio loop remains unblocked
    try:
        await asyncio.to_thread(_process_video_sync, job_id)
    except Exception as e:
        logger.error(f"Error executing analysis pipeline for job {job_id}: {e}", exc_info=True)
        async with db_session.async_session_factory() as session:
            stmt = select(AnalysisJob).where(AnalysisJob.id == job_id)
            res = await session.execute(stmt)
            job = res.scalar_one_or_none()
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
                job.completed_at = datetime.now(UTC)
                await session.commit()


def _process_video_sync(job_id: str) -> None:
    """Synchronous CPU/worker execution of the video processing pipeline."""
    # 1. Fetch job parameters from DB
    import asyncio
    loop = asyncio.new_event_loop()

    async def get_params():
        async with db_session.async_session_factory() as session:
            job = await session.get(AnalysisJob, job_id)
            video = await session.get(Video, job.video_id)
            model_cfg = await session.get(ModelConfig, job.model_config_id)
            return (
                job.conf_threshold,
                job.iou_threshold,
                job.frame_skip,
                job.line_config,
                video.storage_path,
                video.fps,
                video.width,
                video.height,
                video.total_frames,
                model_cfg.name,
            )

    (
        conf_thresh,
        iou_thresh,
        frame_skip,
        line_config_dict,
        video_path,
        video_fps,
        video_w,
        video_h,
        total_frames,
        model_name,
    ) = loop.run_until_complete(get_params())

    # 2. Configure Virtual Line Counter
    line_counter = None
    if line_config_dict and "start" in line_config_dict and "end" in line_config_dict:
        start_pt = line_config_dict["start"]
        end_pt = line_config_dict["end"]
        # Handle normalized (0.0 - 1.0) or pixel coordinates
        p1_x = start_pt["x"] * video_w if start_pt["x"] <= 1.0 else start_pt["x"]
        p1_y = start_pt["y"] * video_h if start_pt["y"] <= 1.0 else start_pt["y"]
        p2_x = end_pt["x"] * video_w if end_pt["x"] <= 1.0 else end_pt["x"]
        p2_y = end_pt["y"] * video_h if end_pt["y"] <= 1.0 else end_pt["y"]

        line_segment = LineSegment(
            name=line_config_dict.get("name", "Counting Line"),
            p1=Point(p1_x, p1_y),
            p2=Point(p2_x, p2_y),
            direction_labels=tuple(line_config_dict.get("direction_labels", ["Inbound", "Outbound"]))
        )
        line_counter = VirtualLineCounter(line_segment)

    # 3. Setup Annotated Output Video Writer (H.264 avc1 for web browser playback)
    annotated_filename = f"annotated_{job_id}.mp4"
    annotated_output_path = settings.ANNOTATED_DIR / annotated_filename
    out_fps = video_fps / frame_skip
    try:
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        writer = cv2.VideoWriter(
            str(annotated_output_path),
            fourcc,
            out_fps,
            (video_w, video_h)
        )
        if not writer.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(
                str(annotated_output_path),
                fourcc,
                out_fps,
                (video_w, video_h)
            )
    except Exception:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(
            str(annotated_output_path),
            fourcc,
            out_fps,
            (video_w, video_h)
        )

    # 4. Initialize YOLO model and ByteTrack
    model = ModelRegistry.get_model(model_name)
    annotator = FrameAnnotator(line_counter.line if line_counter else None)

    # State variables for analytics
    track_histories: dict[int, list[tuple[float, float]]] = {}
    track_classes: dict[int, str] = {}
    track_first_seen: dict[int, int] = {}
    track_last_seen: dict[int, int] = {}

    total_detections_count = 0
    confidence_sum = 0.0
    detections_by_class: dict[str, int] = {}

    # Interval metrics (5-second intervals)
    interval_duration_sec = 5.0
    interval_frames = int(video_fps * interval_duration_sec)
    interval_counts: dict[int, dict[str, int]] = {}

    cap = cv2.VideoCapture(video_path)
    frame_idx = 0
    processed_count = 0
    start_time = time.perf_counter()
    last_db_update_time = time.perf_counter()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1

            # Skip frames if frame_skip > 1
            if frame_idx % frame_skip != 0:
                continue

            processed_count += 1
            time.perf_counter()

            # Run YOLO inference with ByteTrack association
            results = model.track(
                source=frame,
                persist=True,
                tracker="bytetrack.yaml",
                conf=conf_thresh,
                iou=iou_thresh,
                classes=TRAFFIC_CLASS_IDS,
                verbose=False
            )

            current_interval_num = frame_idx // interval_frames if interval_frames > 0 else 0
            if current_interval_num not in interval_counts:
                interval_counts[current_interval_num] = {}

            active_in_frame = 0

            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes

                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        # Extract coordinates
                        xyxy = box.xyxy[0].cpu().numpy().astype(int)
                        cls_id = int(box.cls[0].item())
                        cls_name = TRAFFIC_CLASS_NAMES.get(cls_id, "vehicle")
                        conf = float(box.conf[0].item())

                        # Track ID if available
                        track_id = int(box.id[0].item()) if box.id is not None else None

                        # Tally raw detection
                        total_detections_count += 1
                        confidence_sum += conf
                        detections_by_class[cls_name] = detections_by_class.get(cls_name, 0) + 1
                        interval_counts[current_interval_num][cls_name] = (
                            interval_counts[current_interval_num].get(cls_name, 0) + 1
                        )
                        active_in_frame += 1

                        # Track trajectory & virtual line counting
                        if track_id is not None:
                            bottom_center = (
                                float((xyxy[0] + xyxy[2]) / 2),
                                float(xyxy[3])
                            )

                            if track_id not in track_histories:
                                track_histories[track_id] = []
                                track_classes[track_id] = cls_name
                                track_first_seen[track_id] = frame_idx

                            track_last_seen[track_id] = frame_idx
                            prev_positions = track_histories[track_id]

                            if prev_positions and line_counter:
                                line_counter.update(
                                    track_id=track_id,
                                    class_name=cls_name,
                                    prev_pos=prev_positions[-1],
                                    curr_pos=bottom_center,
                                    frame_index=frame_idx,
                                    fps=video_fps
                                )

                            track_histories[track_id].append(bottom_center)
                            if len(track_histories[track_id]) > 30:  # Retain last 30 points
                                track_histories[track_id].pop(0)

                        # Annotate vehicle on frame
                        trajectory = track_histories.get(track_id, []) if track_id else None
                        annotator.draw_vehicle(
                            frame=frame,
                            box=tuple(xyxy),
                            track_id=track_id,
                            class_name=cls_name,
                            confidence=conf,
                            trajectory=trajectory
                        )

            # Draw virtual line
            in_count = line_counter.counts_by_direction.get("Inbound", 0) if line_counter else 0
            out_count = line_counter.counts_by_direction.get("Outbound", 0) if line_counter else 0
            annotator.draw_counting_line(frame, in_count, out_count)

            # Draw analytics HUD
            elapsed = time.perf_counter() - start_time
            current_fps = processed_count / elapsed if elapsed > 0 else 0.0
            unique_tracks_so_far = len(track_histories)
            total_crossings_so_far = line_counter.total_crossings if line_counter else 0

            annotator.draw_hud(
                frame=frame,
                frame_idx=frame_idx,
                total_frames=total_frames,
                active_tracks_count=active_in_frame,
                total_unique_tracks=unique_tracks_so_far,
                total_crossings=total_crossings_so_far,
                fps_processing=current_fps
            )

            # Write annotated frame to output video
            writer.write(frame)

            # Periodically update job progress in DB (every 1 second)
            if time.perf_counter() - last_db_update_time >= 1.0:
                last_db_update_time = time.perf_counter()
                progress = min(100.0, round((frame_idx / total_frames) * 100, 1)) if total_frames > 0 else 0.0

                async def update_progress():
                    async with db_session.async_session_factory() as session:
                        j = await session.get(AnalysisJob, job_id)
                        if j and j.status == "PROCESSING":
                            j.progress_pct = progress
                            j.current_frame = frame_idx
                            j.total_frames = total_frames
                            j.processing_fps = round(current_fps, 2)
                            j.processing_time_ms = int(elapsed * 1000)
                            await session.commit()

                loop.run_until_complete(update_progress())

    finally:
        cap.release()
        writer.release()

    # 5. Pipeline Completion & Aggregation
    total_elapsed = time.perf_counter() - start_time
    final_fps = processed_count / total_elapsed if total_elapsed > 0 else 0.0

    # Calculate unique track durations
    unique_tracks_count = len(track_histories)
    tracks_by_class: dict[str, int] = {}
    total_track_duration_sec = 0.0

    for tid, cls in track_classes.items():
        tracks_by_class[cls] = tracks_by_class.get(cls, 0) + 1
        duration_frames = track_last_seen[tid] - track_first_seen[tid] + 1
        total_track_duration_sec += duration_frames / video_fps if video_fps > 0 else 0.0

    avg_track_duration = total_track_duration_sec / unique_tracks_count if unique_tracks_count > 0 else 0.0
    avg_conf = confidence_sum / total_detections_count if total_detections_count > 0 else 0.0

    line_summary = line_counter.summary() if line_counter else {
        "total_crossings": 0,
        "counts_by_direction": {},
        "counts_by_class": {}
    }

    # 6. Save Aggregated Summaries to Database
    async def save_final_results():
        async with db_session.async_session_factory() as session:
            j = await session.get(AnalysisJob, job_id)
            if not j:
                return

            j.status = "COMPLETED"
            j.progress_pct = 100.0
            j.current_frame = frame_idx
            j.processing_fps = round(final_fps, 2)
            j.processing_time_ms = int(total_elapsed * 1000)
            j.annotated_video_path = str(annotated_output_path)
            j.completed_at = datetime.now(UTC)

            # Detection Summary
            det_summary = DetectionSummary(
                job_id=job_id,
                total_detections=total_detections_count,
                counts_by_class=detections_by_class,
                average_confidence=round(avg_conf, 3)
            )
            session.add(det_summary)

            # Tracking Summary
            track_summary = TrackingSummary(
                job_id=job_id,
                total_unique_tracks=unique_tracks_count,
                tracks_by_class=tracks_by_class,
                avg_track_duration_sec=round(avg_track_duration, 2),
                total_line_crossings=line_summary["total_crossings"],
                crossings_by_direction=line_summary["counts_by_direction"],
                crossings_by_class=line_summary["counts_by_class"]
            )
            session.add(track_summary)

            # Traffic Intervals
            for int_idx, cls_counts in interval_counts.items():
                int_start = int_idx * interval_duration_sec
                int_end = int_start + interval_duration_sec
                int_total = sum(cls_counts.values())
                int_obj = TrafficInterval(
                    job_id=job_id,
                    interval_start_sec=int_start,
                    interval_end_sec=int_end,
                    vehicle_count=int_total,
                    counts_by_class=cls_counts,
                    avg_density=round(int_total / interval_duration_sec, 2)
                )
                session.add(int_obj)

            await session.commit()
            logger.info(
                f"Analysis Job {job_id} COMPLETED: {total_detections_count} detections, "
                f"{unique_tracks_count} unique vehicles, {line_summary['total_crossings']} line crossings."
            )

    loop.run_until_complete(save_final_results())
    loop.close()

import asyncio
from pathlib import Path

import pytest

from app.core.config import settings


@pytest.mark.asyncio
async def test_full_pipeline_end_to_end(client):
    # 1. Upload sample traffic video
    sample_video_path = Path(__file__).parent / "fixtures" / "sample_traffic.mp4"
    assert sample_video_path.exists(), "Sample traffic video fixture must exist."

    with open(sample_video_path, "rb") as f:
        upload_resp = await client.post(
            "/api/v1/videos/upload",
            files={"file": ("e2e_traffic.mp4", f, "video/mp4")}
        )
    assert upload_resp.status_code == 201
    video_id = upload_resp.json()["id"]

    # 2. Submit analysis job with a virtual counting line across the middle of the road (x=640)
    job_payload = {
        "video_id": video_id,
        "model_name": "yolov8n",
        "conf_threshold": 0.25,
        "iou_threshold": 0.45,
        "frame_skip": 2,  # Process every 2nd frame for fast test execution
        "line_config": {
            "name": "Midpoint Screen Line",
            "start": {"x": 640, "y": 180},
            "end": {"x": 640, "y": 660},
            "direction_labels": ["Inbound", "Outbound"]
        }
    }
    job_resp = await client.post("/api/v1/jobs", json=job_payload)
    assert job_resp.status_code == 202
    job_id = job_resp.json()["id"]

    # 3. Poll background job until it transitions to COMPLETED (or FAILED)
    completed = False
    for _ in range(60):  # Wait up to 30s
        status_resp = await client.get(f"/api/v1/jobs/{job_id}")
        assert status_resp.status_code == 200
        curr_status = status_resp.json()["status"]
        if curr_status == "COMPLETED":
            completed = True
            break
        elif curr_status == "FAILED":
            pytest.fail(f"Pipeline job failed: {status_resp.json().get('error_message')}")
        await asyncio.sleep(0.5)

    assert completed is True, "Analysis job did not reach COMPLETED within timeout."

    # 4. Check results from API
    results_resp = await client.get(f"/api/v1/jobs/{job_id}/results")
    assert results_resp.status_code == 200
    results_data = results_resp.json()

    assert results_data["status"] == "COMPLETED"
    assert results_data["progress_pct"] == 100.0
    assert results_data["processing_fps"] > 0.0

    # Verify detection summary
    det_summary = results_data["detection_summary"]
    assert det_summary is not None
    assert "counts_by_class" in det_summary
    assert "average_confidence" in det_summary

    # Verify tracking summary
    track_summary = results_data["tracking_summary"]
    assert track_summary is not None
    assert "total_unique_tracks" in track_summary
    assert "total_line_crossings" in track_summary
    assert "crossings_by_direction" in track_summary

    # Verify generated annotated video
    annotated_url = results_data["annotated_video_url"]
    assert annotated_url is not None
    annotated_path = settings.ANNOTATED_DIR / f"annotated_{job_id}.mp4"
    assert annotated_path.exists(), f"Annotated video file must exist on disk at {annotated_path}"
    assert annotated_path.stat().st_size > 0, "Annotated video must have non-zero size"

    # 5. Verify PDF Report Export
    report_resp = await client.get(f"/api/v1/reports/{job_id}/export?format=pdf")
    assert report_resp.status_code == 200
    assert report_resp.headers["content-type"] == "application/pdf"
    assert len(report_resp.content) > 1000, "PDF content must be populated"

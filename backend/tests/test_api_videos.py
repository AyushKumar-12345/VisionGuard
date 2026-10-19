from pathlib import Path

import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["online", "degraded"]
    assert "environment" in data
    assert "database" in data
    assert "system_resources" in data


@pytest.mark.asyncio
async def test_video_upload_and_lifecycle(client):
    sample_video_path = Path("tests/fixtures/sample_traffic.mp4")
    assert sample_video_path.exists(), "Sample traffic video fixture must exist."

    with open(sample_video_path, "rb") as f:
        response = await client.post(
            "/api/v1/videos/upload",
            files={"file": ("traffic_test.mp4", f, "video/mp4")}
        )

    assert response.status_code == 201
    video_data = response.json()
    assert video_data["original_filename"] == "traffic_test.mp4"
    assert video_data["total_frames"] == 150
    assert video_data["fps"] == 30.0
    assert video_data["status"] == "READY"
    video_id = video_data["id"]

    # List videos
    list_resp = await client.get("/api/v1/videos")
    assert list_resp.status_code == 200
    videos = list_resp.json()
    assert any(v["id"] == video_id for v in videos)

    # Get single video
    detail_resp = await client.get(f"/api/v1/videos/{video_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == video_id

    # Delete video
    del_resp = await client.delete(f"/api/v1/videos/{video_id}")
    assert del_resp.status_code == 204

    # Confirm deletion
    not_found_resp = await client.get(f"/api/v1/videos/{video_id}")
    assert not_found_resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_upload_rejected(client):
    # Reject text file disguised as mp4
    fake_content = b"This is just a plain text file, not a real MP4 video."
    response = await client.post(
        "/api/v1/videos/upload",
        files={"file": ("fake_video.mp4", fake_content, "video/mp4")}
    )
    assert response.status_code in [400, 422]

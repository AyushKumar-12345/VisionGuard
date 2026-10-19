import hashlib
from pathlib import Path

import cv2

from app.core.logging import logger


class VideoValidationError(Exception):
    """Custom exception raised when a video file fails validation."""


# Magic byte signatures for video formats
VIDEO_MAGIC_SIGNATURES = {
    b"ftyp": "video/mp4",           # ISO Base Media / MP4
    b"RIFF": "video/x-msvideo",     # AVI
    b"\x1a\x45\xdf\xa3": "video/x-matroska", # MKV / WebM
    b"moov": "video/quicktime",     # QuickTime MOV
}


def validate_magic_bytes(file_path: Path) -> str:
    """
    Validates video file by inspecting binary magic signatures.
    Raises VideoValidationError if file does not match a valid video format.
    """
    if not file_path.exists() or file_path.stat().st_size == 0:
        raise VideoValidationError("File is empty or does not exist.")

    with open(file_path, "rb") as f:
        header = f.read(64)

    # Check for signatures anywhere within the first 64 bytes (covers various MP4 box offsets)
    detected_mime = None
    for sig, mime in VIDEO_MAGIC_SIGNATURES.items():
        if sig in header:
            detected_mime = mime
            break

    if not detected_mime:
        raise VideoValidationError(
            "File header failed binary validation. Not a valid supported video format."
        )

    return detected_mime


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file incrementally to avoid loading it into memory."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()


def extract_video_metadata(file_path: Path) -> dict[str, any]:
    """
    Extracts video properties using OpenCV and verifies that frames can be decoded.
    Raises VideoValidationError if OpenCV cannot open or read frames from the video.
    """
    cap = cv2.VideoCapture(str(file_path))
    if not cap.isOpened():
        raise VideoValidationError("OpenCV could not open video stream. The video may be corrupt or encoded in an unsupported codec.")

    try:
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Check basic dimension validity
        if width <= 0 or height <= 0:
            raise VideoValidationError(f"Invalid video dimensions: {width}x{height}")

        # Normalize FPS if corrupted or zero
        if fps <= 0 or fps > 240:
            logger.warning(f"Abnormal FPS {fps} detected, defaulting to 30.0")
            fps = 30.0

        # Verify decode capability on first frame
        ret, frame = cap.read()
        if not ret or frame is None or frame.size == 0:
            raise VideoValidationError("Unable to decode the initial frame from video stream.")

        duration_seconds = total_frames / fps if total_frames > 0 and fps > 0 else 0.0

        return {
            "width": width,
            "height": height,
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration_seconds": round(duration_seconds, 2)
        }
    finally:
        cap.release()

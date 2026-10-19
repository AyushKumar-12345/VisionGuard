import cv2
import numpy as np

from app.services.cv.line_counter import LineSegment

# Distinct high-contrast color palette for vehicle classes (BGR format for OpenCV)
CLASS_COLORS = {
    "car": (245, 130, 49),        # Blue / Teal
    "motorcycle": (60, 180, 75),   # Green
    "bus": (230, 25, 75),          # Red / Coral
    "truck": (145, 30, 180),       # Purple / Magenta
    "default": (200, 200, 200),    # Slate
}


class FrameAnnotator:
    """
    Renders professional bounding boxes, tracking trajectories,
    virtual counting lines, and real-time analytical HUD overlays.
    """

    def __init__(self, line: LineSegment | None = None):
        self.line = line

    def draw_hud(
        self,
        frame: np.ndarray,
        frame_idx: int,
        total_frames: int,
        active_tracks_count: int,
        total_unique_tracks: int,
        total_crossings: int,
        fps_processing: float
    ) -> np.ndarray:
        """Renders an analytical heads-up display (HUD) banner at the top of the frame."""
        h, w, _ = frame.shape
        banner_height = 42

        # Draw semi-transparent dark banner background
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_height), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

        # Draw HUD text metrics
        hud_text = (
            f"Frame: {frame_idx}/{total_frames} | "
            f"In-Frame: {active_tracks_count} | "
            f"Unique Vehicles: {total_unique_tracks} | "
            f"Line Crossings: {total_crossings} | "
            f"FPS: {fps_processing:.1f}"
        )
        cv2.putText(
            frame,
            hud_text,
            (16, 27),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            2,
            cv2.LINE_AA
        )

        return frame

    def draw_counting_line(
        self,
        frame: np.ndarray,
        inbound_count: int = 0,
        outbound_count: int = 0
    ) -> np.ndarray:
        """Draws the virtual counting line and direction arrows on the frame."""
        if not self.line:
            return frame

        p1 = (int(self.line.p1.x), int(self.line.p1.y))
        p2 = (int(self.line.p2.x), int(self.line.p2.y))

        # Draw prominent virtual tripwire line (Yellow with dark border)
        cv2.line(frame, p1, p2, (0, 0, 0), 5, cv2.LINE_AA)
        cv2.line(frame, p1, p2, (0, 230, 255), 3, cv2.LINE_AA)

        # Draw circular endpoints
        cv2.circle(frame, p1, 7, (0, 230, 255), -1, cv2.LINE_AA)
        cv2.circle(frame, p2, 7, (0, 230, 255), -1, cv2.LINE_AA)

        # Label near midpoint
        mid_x = (p1[0] + p2[0]) // 2
        mid_y = (p1[1] + p2[1]) // 2 - 12
        line_label = f"{self.line.name} [In: {inbound_count} | Out: {outbound_count}]"

        cv2.putText(
            frame,
            line_label,
            (mid_x - 80, mid_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 0, 0),
            3,
            cv2.LINE_AA
        )
        cv2.putText(
            frame,
            line_label,
            (mid_x - 80, mid_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 255),
            1,
            cv2.LINE_AA
        )

        return frame

    def draw_vehicle(
        self,
        frame: np.ndarray,
        box: tuple[int, int, int, int],
        track_id: int | None,
        class_name: str,
        confidence: float,
        trajectory: list[tuple[float, float]] | None = None
    ) -> np.ndarray:
        """Draws bounding box, label tag, and motion trajectory tail for a vehicle."""
        x1, y1, x2, y2 = box
        color = CLASS_COLORS.get(class_name, CLASS_COLORS["default"])

        # Draw trajectory history line
        if trajectory and len(trajectory) > 1:
            points = np.array(trajectory, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(frame, [points], isClosed=False, color=color, thickness=2, lineType=cv2.LINE_AA)

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        # Prepare label string
        if track_id is not None:
            label = f"#{track_id} {class_name} {confidence:.2f}"
        else:
            label = f"{class_name} {confidence:.2f}"

        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        tag_y1 = max(0, y1 - text_h - 8)
        tag_y2 = y1

        # Draw label background tag
        cv2.rectangle(frame, (x1, tag_y1), (x1 + text_w + 8, tag_y2), color, -1)
        cv2.putText(
            frame,
            label,
            (x1 + 4, tag_y2 - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )

        return frame

from pathlib import Path

import cv2
import numpy as np


def generate_sample_traffic_video(output_path: Path, num_frames: int = 150, fps: int = 30):
    """
    Synthesizes a realistic 1280x720 traffic surveillance video with moving vehicles.
    Vehicles move across the frame and cross the middle vertical line.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    w, h = 1280, 720
    # Prefer H.264 (avc1) for native HTML5 browser playback
    try:
        fourcc = cv2.VideoWriter_fourcc(*"avc1")
        out = cv2.VideoWriter(str(output_path), fourcc, float(fps), (w, h))
        if not out.isOpened():
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(str(output_path), fourcc, float(fps), (w, h))
    except Exception:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(str(output_path), fourcc, float(fps), (w, h))

    # Vehicle initial states: [x, y, vx, vy, w, h, color, class_name]
    vehicles = [
        {"x": 50, "y": 240, "vx": 6, "w": 140, "h": 70, "color": (190, 110, 40), "cls": "car"},
        {"x": 200, "y": 360, "vx": 5, "w": 220, "h": 110, "color": (40, 50, 190), "cls": "truck"},
        {"x": 10, "y": 520, "vx": 7, "w": 70, "h": 50, "color": (40, 180, 50), "cls": "motorcycle"},
        {"x": 1200, "y": 240, "vx": -6, "w": 140, "h": 70, "color": (180, 180, 60), "cls": "car"},
    ]

    for frame_idx in range(num_frames):
        # Road background
        frame = np.ones((h, w, 3), dtype=np.uint8) * 55
        # Verge / grass
        frame[0:160, :] = [40, 85, 35]
        frame[660:720, :] = [40, 85, 35]

        # White lane lines
        cv2.line(frame, (0, 160), (w, 160), (230, 230, 230), 4)
        cv2.line(frame, (0, 660), (w, 660), (230, 230, 230), 4)

        # Dashed lane markings
        for x in range(0, w, 80):
            cv2.line(frame, (x, 330), (x + 40, 330), (255, 255, 255), 2)
            cv2.line(frame, (x, 490), (x + 40, 490), (255, 255, 255), 2)

        # Draw and update each vehicle
        for v in vehicles:
            curr_x = int(v["x"] + v["vx"] * frame_idx)
            # Wrap around if it goes off screen
            curr_x = curr_x % (w + 200) - 100
            curr_y = int(v["y"])

            # Vehicle body
            cv2.rectangle(frame, (curr_x, curr_y), (curr_x + v["w"], curr_y + v["h"]), v["color"], -1)
            # Wheels
            cv2.circle(frame, (curr_x + 25, curr_y + v["h"]), 10, (15, 15, 15), -1)
            cv2.circle(frame, (curr_x + v["w"] - 25, curr_y + v["h"]), 10, (15, 15, 15), -1)

        out.write(frame)

    out.release()
    print(f"Generated sample traffic video at {output_path} ({num_frames} frames, {fps} FPS)")


if __name__ == "__main__":
    out_file = Path("tests/fixtures/sample_traffic.mp4")
    generate_sample_traffic_video(out_file)

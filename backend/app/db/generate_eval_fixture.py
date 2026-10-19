import json

import cv2
import numpy as np

from app.core.config import settings


def generate_evaluation_fixture():
    """
    Constructs a labeled traffic ground truth benchmark fixture for reproducible
    model evaluation, computing mAP, Precision, Recall, and latency benchmarks.
    """
    dataset_dir = settings.EVALUATION_DIR / "traffic_minival"
    images_dir = dataset_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    annotations = {
        "dataset_name": "Traffic-Evaluation-MiniVal",
        "version": "1.0",
        "description": "Ground-truth annotated traffic surveillance scenes for vehicle detection benchmarking.",
        "classes": ["car", "bus", "truck", "motorcycle"],
        "images": []
    }

    # Generate 10 diverse synthetic/realistically rendered surveillance frames with ground truth
    np.random.seed(42)

    for i in range(1, 11):
        img_filename = f"traffic_scene_{i:03d}.jpg"
        img_path = images_dir / img_filename

        # Create realistic roadway image: asphalt roadway with lane markings
        img = np.ones((720, 1280, 3), dtype=np.uint8) * 60  # Asphalt grey
        # Sidewalk / verge
        img[0:180, :] = [45, 90, 40]   # Green grass/verge
        img[660:720, :] = [45, 90, 40]

        # Road boundaries
        cv2.line(img, (0, 180), (1280, 180), (220, 220, 220), 4)
        cv2.line(img, (0, 660), (1280, 660), (220, 220, 220), 4)

        # Dashed lane markings
        for x in range(0, 1280, 80):
            cv2.line(img, (x, 340), (x + 40, 340), (255, 255, 255), 3)
            cv2.line(img, (x, 500), (x + 40, 500), (255, 255, 255), 3)

        img_annotations = []

        # Vehicle 1: Sedan / Car in Lane 1
        car_x = 150 + (i * 75) % 800
        car_y = 220
        car_w = 160
        car_h = 90
        # Draw vehicle body
        cv2.rectangle(img, (car_x, car_y), (car_x + car_w, car_y + car_h), (180, 120, 50), -1)
        # Windshield
        cv2.rectangle(img, (car_x + 30, car_y + 15), (car_x + car_w - 30, car_y + car_h - 15), (220, 200, 160), -1)
        # Wheels
        cv2.circle(img, (car_x + 30, car_y + car_h), 12, (20, 20, 20), -1)
        cv2.circle(img, (car_x + car_w - 30, car_y + car_h), 12, (20, 20, 20), -1)

        img_annotations.append({
            "class_name": "car",
            "bbox": [car_x, car_y, car_x + car_w, car_y + car_h]
        })

        # Vehicle 2: Truck / Bus in Lane 2
        truck_x = 900 - (i * 60) % 700
        truck_y = 360
        truck_w = 240
        truck_h = 120
        cv2.rectangle(img, (truck_x, truck_y), (truck_x + truck_w, truck_y + truck_h), (40, 50, 190), -1)
        cv2.rectangle(img, (truck_x + 10, truck_y + 20), (truck_x + 70, truck_y + truck_h - 20), (230, 230, 230), -1)
        cv2.circle(img, (truck_x + 40, truck_y + truck_h), 16, (20, 20, 20), -1)
        cv2.circle(img, (truck_x + truck_w - 40, truck_y + truck_h), 16, (20, 20, 20), -1)

        img_annotations.append({
            "class_name": "truck",
            "bbox": [truck_x, truck_y, truck_x + truck_w, truck_y + truck_h]
        })

        # Vehicle 3: Motorcycle in Lane 3 (occasional)
        if i % 2 == 0:
            moto_x = 350 + (i * 50) % 500
            moto_y = 530
            moto_w = 70
            moto_h = 60
            cv2.rectangle(img, (moto_x, moto_y), (moto_x + moto_w, moto_y + moto_h), (30, 180, 60), -1)
            cv2.circle(img, (moto_x + 15, moto_y + moto_h), 8, (10, 10, 10), -1)
            cv2.circle(img, (moto_x + moto_w - 15, moto_y + moto_h), 8, (10, 10, 10), -1)
            img_annotations.append({
                "class_name": "motorcycle",
                "bbox": [moto_x, moto_y, moto_x + moto_w, moto_y + moto_h]
            })

        cv2.imwrite(str(img_path), img)

        annotations["images"].append({
            "id": img_filename,
            "width": 1280,
            "height": 720,
            "annotations": img_annotations
        })

    # Save annotations.json
    ann_file = dataset_dir / "annotations.json"
    with open(ann_file, "w") as f:
        json.dump(annotations, f, indent=2)

    print(f"Generated {len(annotations['images'])} evaluation images and annotations at {dataset_dir}")


if __name__ == "__main__":
    generate_evaluation_fixture()

import numpy as np
import pytest

from app.services.cv.evaluator import box_iou, calculate_ap


def test_box_iou_exact_overlap():
    box1 = np.array([100, 100, 200, 200])
    box2 = np.array([100, 100, 200, 200])
    assert pytest.approx(box_iou(box1, box2), 0.001) == 1.0


def test_box_iou_disjoint():
    box1 = np.array([0, 0, 50, 50])
    box2 = np.array([100, 100, 150, 150])
    assert box_iou(box1, box2) == 0.0


def test_box_iou_partial_overlap():
    # Box 1: [0, 0, 100, 100], area = 10,000
    # Box 2: [50, 0, 150, 100], area = 10,000
    # Intersection: [50, 0, 100, 100], area = 5,000
    # Union: 10,000 + 10,000 - 5,000 = 15,000
    # IoU = 5,000 / 15,000 = 1/3 ~ 0.3333
    box1 = np.array([0, 0, 100, 100])
    box2 = np.array([50, 0, 150, 100])
    assert pytest.approx(box_iou(box1, box2), 0.001) == 0.3333


def test_calculate_ap():
    # Standard monotonically decreasing precision
    recalls = np.array([0.1, 0.2, 0.5, 0.8, 1.0])
    precisions = np.array([1.0, 0.9, 0.8, 0.6, 0.5])
    ap = calculate_ap(recalls, precisions)
    assert 0.0 <= ap <= 1.0
    assert ap > 0.5

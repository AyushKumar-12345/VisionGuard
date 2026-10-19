from app.services.cv.line_counter import (
    LineSegment,
    Point,
    VirtualLineCounter,
    ccw,
    segments_intersect,
)


def test_ccw_orientation():
    # Counter-clockwise orientation test
    a = Point(0, 0)
    b = Point(5, 0)
    c_left = Point(2, 4)   # Above the line -> positive cross-product
    c_right = Point(2, -4) # Below the line -> negative cross-product
    c_collinear = Point(10, 0) # On the line -> zero cross-product

    assert ccw(a, b, c_left) > 0
    assert ccw(a, b, c_right) < 0
    assert ccw(a, b, c_collinear) == 0


def test_segments_intersect():
    # Perpendicular intersecting segments
    p1 = Point(0, 5)
    p2 = Point(10, 5)
    p3 = Point(5, 0)
    p4 = Point(5, 10)
    assert segments_intersect(p1, p2, p3, p4) is True

    # Non-intersecting parallel segments
    p5 = Point(0, 2)
    p6 = Point(10, 2)
    assert segments_intersect(p1, p2, p5, p6) is False

    # Skew non-intersecting segments
    p7 = Point(20, 20)
    p8 = Point(25, 25)
    assert segments_intersect(p1, p2, p7, p8) is False


def test_virtual_line_counter_crossing_and_debouncing():
    # Vertical counting line at x=500, from y=100 to y=600
    line = LineSegment(
        name="Main Road Gate",
        p1=Point(500, 100),
        p2=Point(500, 600),
        direction_labels=("Inbound", "Outbound")
    )
    counter = VirtualLineCounter(line)

    # Vehicle 1 moving from left (x=480) to right (x=520) across line
    event = counter.update(
        track_id=1,
        class_name="car",
        prev_pos=(480, 300),
        curr_pos=(520, 300),
        frame_index=15,
        fps=30.0
    )
    assert event is not None
    assert event.track_id == 1
    assert event.class_name == "car"
    assert counter.total_crossings == 1
    assert counter.counts_by_class["car"] == 1

    # Same vehicle moves further right (x=520 -> x=550) - MUST BE DEBOUNCED
    event_repeat = counter.update(
        track_id=1,
        class_name="car",
        prev_pos=(520, 300),
        curr_pos=(550, 300),
        frame_index=16,
        fps=30.0
    )
    assert event_repeat is None
    assert counter.total_crossings == 1  # Strictly unchanged

    # Vehicle 2 (Truck) moving in opposite direction
    event2 = counter.update(
        track_id=2,
        class_name="truck",
        prev_pos=(520, 350),
        curr_pos=(480, 350),
        frame_index=20,
        fps=30.0
    )
    assert event2 is not None
    assert event2.track_id == 2
    assert counter.total_crossings == 2
    assert counter.counts_by_class["truck"] == 1
    # Check that opposite direction was assigned
    assert event.direction != event2.direction

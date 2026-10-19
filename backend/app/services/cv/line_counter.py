from dataclasses import dataclass


@dataclass
class Point:
    x: float
    y: float


@dataclass
class LineSegment:
    name: str
    p1: Point
    p2: Point
    direction_labels: tuple[str, str] = ("Inbound", "Outbound")


@dataclass
class CrossingEvent:
    track_id: int
    class_name: str
    frame_index: int
    direction: str
    line_name: str
    timestamp_sec: float


def ccw(a: Point, b: Point, c: Point) -> float:
    """
    Computes 2D vector cross-product orientation test.
    Returns:
      > 0 for counter-clockwise turn
      < 0 for clockwise turn
      = 0 for collinear points
    Orientation = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)
    """
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)


def segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    """
    Determines whether line segment (p1, p2) intersects segment (p3, p4).
    Uses standard computational geometry orientation checks.
    """
    d1 = ccw(p3, p4, p1)
    d2 = ccw(p3, p4, p2)
    d3 = ccw(p1, p2, p3)
    d4 = ccw(p1, p2, p4)

    # General intersection case: endpoints of each segment lie on opposite sides of the other
    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    return False


class VirtualLineCounter:
    """
    Tracks and counts vehicles crossing a virtual count line.

    Guarantees:
    - Zero duplicate counts: Tracks are debounced per line.
    - Directional discrimination: Distinguishes 'Inbound' vs 'Outbound' based on vector orientation.
    - Class-specific counts: Categorizes crossings by detected vehicle class.
    """

    def __init__(self, line: LineSegment):
        self.line = line
        self.crossed_track_ids: set[int] = set()
        self.crossings: list[CrossingEvent] = []
        self.counts_by_direction: dict[str, int] = {
            line.direction_labels[0]: 0,
            line.direction_labels[1]: 0
        }
        self.counts_by_class: dict[str, int] = {}

    def update(
        self,
        track_id: int,
        class_name: str,
        prev_pos: tuple[float, float],
        curr_pos: tuple[float, float],
        frame_index: int,
        fps: float
    ) -> CrossingEvent | None:
        """
        Check if vehicle track crossed the virtual line between prev_pos and curr_pos.

        prev_pos, curr_pos: (x, y) coordinates of the bottom-center of the vehicle bounding box.
        """
        # If this vehicle already crossed this line, debounce to prevent multi-counting
        if track_id in self.crossed_track_ids:
            return None

        p_prev = Point(prev_pos[0], prev_pos[1])
        p_curr = Point(curr_pos[0], curr_pos[1])

        # Test intersection between vehicle motion segment and virtual line segment
        if segments_intersect(p_prev, p_curr, self.line.p1, self.line.p2):
            # Determine direction using vector cross-product orientation
            turn = ccw(self.line.p1, self.line.p2, p_curr)
            direction = self.line.direction_labels[0] if turn > 0 else self.line.direction_labels[1]

            timestamp_sec = frame_index / fps if fps > 0 else 0.0

            event = CrossingEvent(
                track_id=track_id,
                class_name=class_name,
                frame_index=frame_index,
                direction=direction,
                line_name=self.line.name,
                timestamp_sec=round(timestamp_sec, 2)
            )

            # Record event and update totals
            self.crossed_track_ids.add(track_id)
            self.crossings.append(event)
            self.counts_by_direction[direction] = self.counts_by_direction.get(direction, 0) + 1
            self.counts_by_class[class_name] = self.counts_by_class.get(class_name, 0) + 1

            return event

        return None

    @property
    def total_crossings(self) -> int:
        return len(self.crossings)

    def summary(self) -> dict[str, any]:
        return {
            "total_crossings": self.total_crossings,
            "counts_by_direction": self.counts_by_direction,
            "counts_by_class": self.counts_by_class
        }

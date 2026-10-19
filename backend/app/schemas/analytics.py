from pydantic import BaseModel


class AnalyticsOverview(BaseModel):
    total_videos_analyzed: int
    total_detections_recorded: int
    total_unique_vehicles_tracked: int
    total_line_crossings: int
    active_jobs_count: int


class ClassDistribution(BaseModel):
    class_name: str
    count: int
    percentage: float


class TrafficDistributionResponse(BaseModel):
    total: int
    distribution: list[ClassDistribution]

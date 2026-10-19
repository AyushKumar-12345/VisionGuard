from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    evaluations,
    health,
    jobs,
    models,
    reports,
    videos,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(videos.router, prefix="/videos", tags=["Videos"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Analysis Jobs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Traffic Analytics"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["Model Evaluations"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

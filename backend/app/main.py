from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import logger
from app.db.seed import seed_defaults
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: startup initialization and graceful shutdown."""
    logger.info("Initializing VisionGuard system...")
    settings.ensure_directories()
    await init_db()
    await seed_defaults()
    logger.info("VisionGuard startup complete. Ready for traffic analytics inference.")
    yield
    logger.info("Shutting down VisionGuard.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="VisionGuard — Multi-Model Traffic Intelligence and Vehicle Analytics API",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static File Serving for Uploaded and Annotated Videos
app.mount("/media/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/media/annotated", StaticFiles(directory=str(settings.ANNOTATED_DIR)), name="annotated")

# Mount API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "title": "VisionGuard — Multi-Model Traffic Intelligence",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure Windows OpenCV video backend loads openh264 DLL
if sys.platform == "win32":
    backend_dir = str(Path(__file__).resolve().parent.parent)
    if backend_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] = backend_dir + os.pathsep + os.environ.get("PATH", "")
    if hasattr(os, "add_dll_directory") and Path(backend_dir).exists():
        try:
            os.add_dll_directory(backend_dir)
        except Exception:
            pass

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
    allow_origins=settings.ALLOWED_ORIGINS + ["https://visionguard-frontend.onrender.com"],
    allow_origin_regex=r"https?://.*\.onrender\.com.*",
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
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)

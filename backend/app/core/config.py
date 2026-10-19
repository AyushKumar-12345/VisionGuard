from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings for VisionGuard."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    PROJECT_NAME: str = "VisionGuard"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Security & CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Database: Supports async PostgreSQL or async SQLite fallback
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./visionguard.db",
        description="Async database connection string (e.g. postgresql+asyncpg://user:pass@localhost:5432/visionguard or sqlite+aiosqlite:///./visionguard.db)"
    )
    SYNC_DATABASE_URL: str | None = Field(
        default=None,
        description="Sync database connection string for Alembic migrations"
    )

    # Storage Paths (resolved relative to workspace root)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    ANNOTATED_DIR: Path = DATA_DIR / "annotated"
    REPORTS_DIR: Path = DATA_DIR / "reports"
    WEIGHTS_DIR: Path = DATA_DIR / "weights"
    EVALUATION_DIR: Path = DATA_DIR / "evaluations"

    # Ingestion constraints
    MAX_UPLOAD_SIZE_BYTES: int = 200 * 1024 * 1024  # 200 MB
    ALLOWED_VIDEO_EXTENSIONS: list[str] = [".mp4", ".avi", ".mov", ".mkv"]
    ALLOWED_MIME_TYPES: list[str] = [
        "video/mp4",
        "video/x-msvideo",
        "video/quicktime",
        "video/x-matroska"
    ]

    # CV & Inference Configuration
    DEFAULT_CONF_THRESHOLD: float = 0.35
    DEFAULT_IOU_THRESHOLD: float = 0.45
    DEFAULT_MODEL_NAME: str = "yolov8n"
    DEVICE: str = "cpu"  # 'cpu' or 'cuda' (auto-selected in runtime)
    MAX_CONCURRENT_JOBS: int = 1
    CPU_INFERENCE_THREADS: int = 8

    def ensure_directories(self) -> None:
        """Ensure all storage directories exist."""
        for path in [
            self.DATA_DIR,
            self.UPLOAD_DIR,
            self.ANNOTATED_DIR,
            self.REPORTS_DIR,
            self.WEIGHTS_DIR,
            self.EVALUATION_DIR
        ]:
            path.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()

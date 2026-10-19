from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db import session as db_session
from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Use isolated test database
TEST_DB_PATH = Path("./test_visionguard.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

test_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Align main session factory with test database for background tasks
db_session.engine = test_engine
db_session.async_session_factory = test_session_factory


@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_database():
    """Create all tables and seed default models for testing."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Override settings and session
    async with test_session_factory() as session:
        # Seed models
        from app.models.analysis import ModelConfig
        from app.models.evaluation import EvaluationDataset
        session.add(ModelConfig(
            name="yolov8n",
            model_family="YOLOv8",
            weight_identifier="yolov8n.pt",
            weight_file_path=str(settings.WEIGHTS_DIR / "yolov8n.pt"),
            input_size=640,
            default_conf=0.35,
            default_iou=0.45,
            is_active=True
        ))
        session.add(ModelConfig(
            name="yolov8s",
            model_family="YOLOv8",
            weight_identifier="yolov8s.pt",
            weight_file_path=str(settings.WEIGHTS_DIR / "yolov8s.pt"),
            input_size=640,
            default_conf=0.35,
            default_iou=0.45,
            is_active=True
        ))
        session.add(EvaluationDataset(
            name="Traffic-Evaluation-MiniVal",
            version="1.0",
            split="val",
            num_samples=10,
            num_ground_truth_boxes=25,
            dataset_path=str(settings.EVALUATION_DIR / "traffic_minival"),
            license="CC-BY-4.0"
        ))
        await session.commit()

    yield

    # Clean up test database
    await test_engine.dispose()
    TEST_DB_PATH.unlink(missing_ok=True)


async def override_get_db():
    async with test_session_factory() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

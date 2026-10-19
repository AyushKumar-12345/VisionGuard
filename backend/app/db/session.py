from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.logging import logger
from app.db.base import Base

# Engine configuration with connection pooling
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args=connect_args
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session rollback due to exception: {e}")
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables for initial startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas verified and initialized.")

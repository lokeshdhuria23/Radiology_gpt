from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from supabase import Client

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import create_supabase_client

logger = get_logger("database.session")

# Format database URL
db_url = settings.SUPABASE_DB_URL

# Connect arguments with short timeout to prevent server thread blocking when remote DB port is unreachable
connect_args = {}
if "postgresql" in db_url:
    connect_args = {"timeout": 3}

# SQLAlchemy async engine configured for Supabase PostgreSQL
try:
    engine = create_async_engine(
        db_url,
        echo=(settings.APP_ENV == "development" and settings.LOG_LEVEL.upper() == "DEBUG"),
        future=True,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
except Exception as e:
    logger.warning(f"Could not initialize primary database engine: {e}")
    engine = create_async_engine("sqlite+aiosqlite:///./logs/clinic.db", future=True)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async SQLAlchemy database session.
    Ensures safe commit, error rollback, and session closure.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


def get_supabase_client() -> Client:
    """Helper function to retrieve an authenticated Supabase client."""
    return create_supabase_client()

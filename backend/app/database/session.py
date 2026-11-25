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

# Format database URL with IPv6 support to prevent Windows DNS getaddrinfo timeouts
db_url = settings.SUPABASE_DB_URL
if "db.ohldosoabcpixgizbzxa.supabase.co" in db_url:
    db_url = db_url.replace("db.ohldosoabcpixgizbzxa.supabase.co", "[2406:da1a:109c:2600:f75f:79a2:e721:a784]")

# SQLAlchemy async engine configured for Supabase PostgreSQL
engine = create_async_engine(
    db_url,
    echo=(settings.APP_ENV == "development" and settings.LOG_LEVEL.upper() == "DEBUG"),
    future=True,
    pool_pre_ping=True,
)

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

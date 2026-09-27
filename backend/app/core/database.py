"""
Async SQLAlchemy engine/session configuration targeting a PostGIS-enabled
PostgreSQL instance. GeoAlchemy2 is imported so its spatial column types
(Geometry, Geography) and ORM event hooks are registered before any model
class is declared.
"""
from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

import geoalchemy2  # noqa: F401  (registers Geometry/Geography DDL + type compilation with SQLAlchemy)
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

# Load backend/.env explicitly so DATABASE_URL is populated regardless of
# the process's current working directory (e.g. running uvicorn from repo root).
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# ---------------------------------------------------------------------------
# Connection settings
# ---------------------------------------------------------------------------
POSTGRES_USER = os.getenv("POSTGRES_USER", "cadastre_admin")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "cadastre_secret")
POSTGRES_DB = os.getenv("POSTGRES_DB", "cadastre_db")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}",
)

# echo=False in production; toggle via env for local SQL debugging.
SQL_ECHO = os.getenv("SQL_ECHO", "false").lower() == "true"

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models (parcels, buildings, DEMs)."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a request-scoped async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for use outside of FastAPI's DI system (e.g. background tasks, CLI scripts)."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def verify_postgis_ready() -> dict[str, str]:
    """
    Sanity-checks the connection and confirms PostGIS spatial extensions are
    installed. Intended for startup health checks / /api/health endpoints.
    """
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT PostGIS_Full_Version();"))
        version_string = result.scalar_one()

        ext_result = await conn.execute(
            text(
                "SELECT extname FROM pg_extension "
                "WHERE extname IN ('postgis', 'postgis_raster', 'postgis_topology', 'postgis_sfcgal');"
            )
        )
        installed_extensions = [row[0] for row in ext_result.fetchall()]

    return {
        "postgis_version": version_string,
        "installed_extensions": installed_extensions,
    }


async def init_models() -> None:
    """Creates all tables registered on Base.metadata. Use Alembic migrations in production."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_engine() -> None:
    """Cleanly closes the connection pool on application shutdown."""
    await engine.dispose()

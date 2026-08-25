import os
import asyncpg
import aioredis
import logging

logger = logging.getLogger(__name__)

_DB_POOL = None
_REDIS_POOL = None

async def get_db():
    """Return a singleton asyncpg connection pool.
    Uses DATABASE_URL env var (PostgreSQL)."""
    global _DB_POOL
    if _DB_POOL is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise RuntimeError("DATABASE_URL env var not set")
        _DB_POOL = await asyncpg.create_pool(dsn=db_url)
        logger.info("PostgreSQL pool created")
    return _DB_POOL

async def get_redis():
    """Return a singleton aioredis connection pool.
    Uses REDIS_URL env var."""
    global _REDIS_POOL
    if _REDIS_POOL is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost")
        _REDIS_POOL = await aioredis.from_url(redis_url, decode_responses=True)
        logger.info("Redis client created")
    return _REDIS_POOL

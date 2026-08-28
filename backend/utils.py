import os
import logging
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from redis import asyncio as redis

logger = logging.getLogger(__name__)

_DB_POOL = None
_REDIS_POOL = None

def get_db():
    """Return a singleton psycopg2 ThreadedConnectionPool.
    Uses DATABASE_URL env var (PostgreSQL)."""
    global _DB_POOL
    if _DB_POOL is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise RuntimeError("DATABASE_URL env var not set")
        # psycopg2 expects a DSN string; the same URL works.
        _DB_POOL = ThreadedConnectionPool(minconn=1, maxconn=10, dsn=db_url)
        logger.info("PostgreSQL ThreadedConnectionPool created")
    return _DB_POOL

async def get_redis():
    """Return a singleton aioredis connection pool.
    Uses REDIS_URL env var."""
    global _REDIS_POOL
    if _REDIS_POOL is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost")
        _REDIS_POOL = redis.from_url(redis_url, decode_responses=True)
        logger.info("Redis client created")
    return _REDIS_POOL

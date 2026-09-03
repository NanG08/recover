import os
import logging
import psycopg
from psycopg_pool import ConnectionPool
from redis import asyncio as aioredis

logger = logging.getLogger(__name__)

_DB_POOL: ConnectionPool | None = None
_REDIS_POOL = None


def get_db() -> ConnectionPool:
    global _DB_POOL
    if _DB_POOL is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise RuntimeError("DATABASE_URL env var not set")
        _DB_POOL = ConnectionPool(db_url, min_size=1, max_size=10, open=True)
        logger.info("psycopg3 ConnectionPool created")
    return _DB_POOL


async def get_redis():
    global _REDIS_POOL
    if _REDIS_POOL is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost")
        _REDIS_POOL = aioredis.from_url(redis_url, decode_responses=True)
        logger.info("Redis client created")
    return _REDIS_POOL

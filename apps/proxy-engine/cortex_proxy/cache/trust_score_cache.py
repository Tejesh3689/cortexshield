import os
import redis.asyncio as redis

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    return _redis_client

async def get_tenant_trust_score(tenant_id: str) -> float:
    r = get_redis()
    try:
        score = await r.get(f"trust:{tenant_id}")
        if score is None:
            return 1.0 # default if no memories
        return float(score)
    except Exception:
        # Fallback if Redis is down
        return 1.0

async def invalidate_tenant_trust_score(tenant_id: str):
    """Stub to be implemented by healing-worker logic in Milestone 4"""
    r = get_redis()
    await r.delete(f"trust:{tenant_id}")

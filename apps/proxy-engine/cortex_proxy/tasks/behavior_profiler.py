import asyncio
import json
import logging
from datetime import datetime, timedelta
from statistics import mean, stdev
from collections import Counter

from sqlalchemy import select, text
from cortex_db.models import AgentBehavioralProfile, Tenant
from cortex_proxy.db import async_session_maker
logger = logging.getLogger(__name__)

async def build_agent_profile(tenant_id: str, agent_id: str):
    from cortex_proxy.main import redis_client
    try:
        # Read last 30 days of events from Redis stream
        min_timestamp = int((datetime.utcnow() - timedelta(days=30)).timestamp() * 1000)
        stream_key = f"behavior:{tenant_id}:{agent_id}"
        events = await redis_client.xrange(stream_key, min=min_timestamp, count=10000)
        
        if len(events) < 20:
            return  # not enough data to build a reliable profile
        
        # Calculate tool distribution
        tool_counts = Counter(e[1].get('tool_name', 'unknown') for e in events)
        total = sum(tool_counts.values())
        tool_distribution = {k: v/total for k, v in tool_counts.items()}
        
        # Calculate content length stats
        lengths = [int(e[1].get('content_length', 0)) for e in events]
        avg_length = mean(lengths)
        stddev_length = stdev(lengths) if len(lengths) > 1 else 0.0
        
        # Calculate hourly distribution
        hours = []
        for e in events:
            try:
                dt = datetime.fromisoformat(e[1].get('timestamp', ''))
                hours.append(dt.hour)
            except ValueError:
                pass
        hour_counts = Counter(hours)
        total_hours = sum(hour_counts.values())
        hourly_dist = {str(h): count/total_hours for h, count in hour_counts.items()} if total_hours > 0 else {}
        
        period_start = datetime.utcnow() - timedelta(days=30)
        period_end = datetime.utcnow()
        
        async with async_session_maker() as db:
            await db.execute(
                text("DELETE FROM agent_behavioral_profiles WHERE tenant_id = :t AND agent_id = :a"),
                {"t": tenant_id, "a": agent_id}
            )
            
            insert_query = text("""
                INSERT INTO agent_behavioral_profiles
                (id, tenant_id, agent_id, profile_period_start, profile_period_end,
                 tool_distribution, avg_content_length_bytes, stddev_content_length_bytes,
                 hourly_distribution, total_calls, total_sessions, is_stable, created_at, updated_at)
                VALUES (gen_random_uuid(), :tenant_id, :agent_id, :profile_period_start, :profile_period_end,
                 :tool_distribution, :avg_content_length_bytes, :stddev_content_length_bytes,
                 :hourly_distribution, :total_calls, 1, :is_stable, NOW(), NOW())
            """)
            await db.execute(insert_query, {
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "profile_period_start": period_start,
                "profile_period_end": period_end,
                "tool_distribution": json.dumps(tool_distribution),
                "avg_content_length_bytes": avg_length,
                "stddev_content_length_bytes": stddev_length,
                "hourly_distribution": json.dumps(hourly_dist),
                "total_calls": total,
                "is_stable": total >= 100
            })
            await db.commit()
            
    except Exception as e:
        logger.error(f"Failed to build behavioral profile for {tenant_id}/{agent_id}: {e}", exc_info=True)


async def profile_all_agents():
    """Background job to profile all agents across all tenants."""
    from cortex_proxy.main import redis_client
    try:
        # Get all unique agents that have events in Redis recently
        # We can find all keys matching behavior:*:*
        # In a real cluster we'd use SCAN, but for proxy-engine it's okay
        cursor = b'0'
        keys = []
        while cursor:
            cursor, partial_keys = await redis_client.scan(cursor, match="behavior:*:*", count=1000)
            keys.extend(partial_keys)
            
        for key in set(keys):
            parts = key.split(":")
            if len(parts) >= 3:
                tenant_id = parts[1]
                agent_id = ":".join(parts[2:])
                await build_agent_profile(tenant_id, agent_id)
                
    except Exception as e:
        logger.error(f"Failed to run behavioral profiler job: {e}", exc_info=True)

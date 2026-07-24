import os
import json
import asyncio
import logging
import nats
import redis.asyncio as redis
from cortex_schemas.models import MemoryWriteJob
from .extraction.llm_triplet_extractor import extract_triplets, check_poison
from .extraction.entity_resolution import resolve_entities
from .graph.contradiction_healer import heal_graph
from .graph.cycle_detector import detect_and_break_cycles

logger = logging.getLogger(__name__)

async def invalidate_cache(tenant_id: str):
    # This calls the stub from proxy-engine cache without coupling the codebases tightly.
    # In a real setup we'd import the shared library or publish an invalidation event.
    r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    await r.delete(f"trust:{tenant_id}")
    await r.aclose()

async def run_worker():
    nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    js = nc.jetstream()
    
    r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    
    async def message_handler(msg):
        try:
            data = json.loads(msg.data.decode())
            job = MemoryWriteJob(**data)
            
            # Idempotency check via Redis
            is_new = await r.setnx(f"job_dedupe:{job.job_id}", "1")
            if not is_new:
                logger.info(f"Skipping duplicate job {job.job_id}")
                await msg.ack()
                return
            await r.expire(f"job_dedupe:{job.job_id}", 86400) # expire in 24h
            
            logger.info(f"Processing job {job.job_id} for tenant {job.tenant_id}")
            
            # Step 1: Poison Check & Extraction
            trust_score, is_poison = check_poison(job.raw_text, job.origin_source)
            triplets = await extract_triplets(job.raw_text)
            
            if not triplets:
                await msg.ack()
                return

            # Step 2: Entity Resolution
            resolved_triplets = await resolve_entities(triplets)
            
            # Step 3: Graph Healing (Supersession)
            await heal_graph(job.tenant_id, resolved_triplets, trust_score, is_poison)
            
            # Step 4: Cycle Detection
            cycles_broken = await detect_and_break_cycles(job.tenant_id)
            
            # Step 5: Invalidate Cache
            await invalidate_cache(job.tenant_id)
            
            await msg.ack()
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            # Do not ack, let NATS redeliver
            
    # Durable at-least-once consumer
    await js.subscribe(
        "memory.writes.raw",
        durable="healing-worker-consumer",
        cb=message_handler,
        stream="MEMORY_WRITES"
    )
    
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run_worker())

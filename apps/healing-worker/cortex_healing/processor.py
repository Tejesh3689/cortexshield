"""
cortex_healing.processor — Core memory-write processing logic.

In the full production architecture, this function is the NATS JetStream
consumer's message handler: the healing-worker subscribes to the
"memory.writes.raw" subject and calls process_memory_write_job() per message
with at-least-once delivery guarantees.

For the hackathon build, proxy-engine calls this function directly as a
FastAPI BackgroundTask (asyncio.create_task), removing the NATS broker
dependency. See docs/adr/0013-hackathon-nats-opa-removal.md for the full
rationale and the conditions under which NATS should be restored.
"""
import logging
from cortex_schemas.models import MemoryWriteJob
from .extraction.llm_triplet_extractor import extract_triplets, check_poison
from .extraction.entity_resolution import resolve_entities
from .graph.contradiction_healer import heal_graph
from .graph.cycle_detector import detect_and_break_cycles

logger = logging.getLogger(__name__)

# In-process dedup set. Bounded by process lifetime; sufficient for hackathon
# single-process deployment. In the full NATS architecture, Redis setnx
# provides cross-replica dedup. See ADR-0013.
_processed_job_ids: set[str] = set()


async def process_memory_write_job(job: MemoryWriteJob) -> None:
    """
    Process a single memory write job: poison-check, triplet extraction,
    entity resolution, graph healing, and cycle detection.

    Idempotent per job_id within a single process lifetime.
    In the full NATS architecture, idempotency is backed by Redis setnx
    (see docs/adr/0013-hackathon-nats-opa-removal.md).
    """
    if job.job_id in _processed_job_ids:
        logger.info(f"Skipping duplicate in-process job {job.job_id}")
        return

    _processed_job_ids.add(job.job_id)

    logger.info(f"Processing job {job.job_id} for tenant {job.tenant_id}")

    try:
        # Step 1: Poison Check & Trust Score
        trust_score, is_poison = check_poison(job.raw_text, job.origin_source)
        triplets = await extract_triplets(job.raw_text)

        if not triplets:
            logger.info(f"No triplets extracted for job {job.job_id} — skipping graph write.")
            return

        # Step 2: Entity Resolution
        resolved_triplets = await resolve_entities(triplets)

        # Step 3: Graph Healing (Supersession)
        await heal_graph(job.tenant_id, resolved_triplets, trust_score, is_poison)

        # Step 4: Cycle Detection & Breaking
        await detect_and_break_cycles(job.tenant_id)

        logger.info(f"Job {job.job_id} completed successfully.")

    except Exception as e:
        logger.error(f"Error processing job {job.job_id}: {e}", exc_info=True)
        # Remove from dedup set so a retry is possible if this was a transient failure.
        _processed_job_ids.discard(job.job_id)
        raise

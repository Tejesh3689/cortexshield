"""
Memory write fast path — ingress handler for tools/call:add_memory.

NATS NOTE: In the full architecture, this function publishes a MemoryWriteJob
to NATS JetStream ("memory.writes.raw") and returns immediately. The healing-
worker's NATS consumer then calls cortex_healing.processor.process_memory_write_job.

HACKATHON SIMPLIFICATION (see docs/adr/0013-hackathon-nats-opa-removal.md):
We call process_memory_write_job directly via asyncio.create_task, removing the
NATS broker dependency. The processing logic is identical; only the delivery
mechanism differs.
"""
import asyncio
import logging
from datetime import datetime
from cortex_schemas.models import ToolCallRequest, ToolCallResponse, MemoryWriteJob, OriginSource

logger = logging.getLogger(__name__)


async def handle_add_memory(
    request: ToolCallRequest,
    tenant_id: str,
    agent_id: str,
) -> ToolCallResponse:
    """
    Accepts a memory write request, constructs a MemoryWriteJob, and dispatches
    it as a background task. Returns immediately without blocking the response path.
    """
    raw_text = request.params.get("arguments", {}).get("text", "")

    job = MemoryWriteJob(
        tenant_id=tenant_id,
        agent_id=agent_id,
        raw_text=raw_text,
        origin_source=OriginSource.USER_PROMPT,
        submitted_at=datetime.utcnow(),
    )

    # Import here to avoid a circular import at module load time.
    # cortex_healing is installed as a local path dependency (see proxy-engine/pyproject.toml).
    try:
        from cortex_healing.processor import process_memory_write_job
        
        async def run_and_log_memory_job(j: MemoryWriteJob):
            try:
                await process_memory_write_job(j)
                logger.info(f"Successfully processed memory write job for tenant {j.tenant_id}")
            except Exception as e:
                logger.error(f"BACKGROUND TASK FAILED: process_memory_write_job raised an exception: {e}", exc_info=True)
                
        asyncio.create_task(run_and_log_memory_job(job))
    except ImportError:
        logger.error(
            "cortex_healing not importable — memory write job dropped. "
            "Ensure cortex_healing is installed as a path dependency in proxy-engine/pyproject.toml."
        )

    return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "Memory ingestion queued successfully."}], "isError": False})

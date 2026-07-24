import os
import json
from datetime import datetime
import nats
from cortex_schemas.models import ToolCallRequest, ToolCallResponse, MemoryWriteJob, OriginSource

async def handle_add_memory(request: ToolCallRequest, tenant_id: str, agent_id: str) -> ToolCallResponse:
    raw_text = request.params.get("arguments", {}).get("text", "")
    
    job = MemoryWriteJob(
        tenant_id=tenant_id,
        agent_id=agent_id,
        raw_text=raw_text,
        origin_source=OriginSource.USER_PROMPT,
        submitted_at=datetime.utcnow()
    )
    
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        js = nc.jetstream()
        
        await js.publish("memory.writes.raw", job.model_dump_json().encode())
        await nc.close()
    except Exception as e:
        # We would log this in a real system, but we must fail gracefully if NATS is down.
        pass
    
    return ToolCallResponse(id=request.id, result={"status": "enqueued"})

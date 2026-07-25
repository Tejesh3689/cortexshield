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
import uuid
import hashlib
from cortex_schemas.models import ToolCallRequest, ToolCallResponse, MemoryWriteJob, OriginSource
from opentelemetry import trace, context

logger = logging.getLogger(__name__)
tracer = trace.get_tracer('proxy-engine')


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
    logger.info(f"[DIAGNOSTIC] add_memory called by tenant={tenant_id} agent={agent_id} text='{raw_text}'")

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
        logger.info(f"[DIAGNOSTIC] Successfully imported process_memory_write_job")
        
        ctx = context.get_current()
        async def run_and_log_memory_job(j: MemoryWriteJob):
            token = context.attach(ctx)
            try:
                with tracer.start_as_current_span('proxy.memory.ingest'):
                    await process_memory_write_job(j)
                logger.info(f"Successfully processed memory write job for tenant {j.tenant_id}")
            except Exception as e:
                logger.error(f"BACKGROUND TASK FAILED: process_memory_write_job raised an exception: {e}", exc_info=True)
            finally:
                context.detach(token)
                
        asyncio.create_task(run_and_log_memory_job(job))
    except ImportError as ie:
        logger.error(f"[DIAGNOSTIC] ImportError loading cortex_healing: {ie}")

    return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "Memory ingestion queued successfully."}], "isError": False})


async def handle_process_document(
    request: ToolCallRequest,
    tenant_id: str,
    agent_id: str,
) -> ToolCallResponse:
    '''
    Accepts an untrusted document, constructs a MemoryWriteJob, and dispatches
    it as a background task.
    '''
    raw_text = request.params.get('arguments', {}).get('document_text', '')
    doc_id = str(uuid.uuid4())
    doc_hash = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()

    job = MemoryWriteJob(
        tenant_id=tenant_id,
        agent_id=agent_id,
        raw_text=raw_text,
        origin_source=OriginSource.UNTRUSTED_DOC,
        submitted_at=datetime.utcnow(),
        doc_id=doc_id,
        document_hash=doc_hash,
        source_type="unknown",
        tool_name="process_document",
        request_id=str(request.id)
    )

    try:
        from cortex_healing.processor import process_memory_write_job
        
        ctx = context.get_current()
        async def run_and_log_memory_job(j: MemoryWriteJob):
            token = context.attach(ctx)
            try:
                with tracer.start_as_current_span('proxy.memory.ingest'):
                    await process_memory_write_job(j)
                logger.info(f'Successfully processed document write job for tenant {j.tenant_id}')
            except Exception as e:
                logger.error(f'BACKGROUND TASK FAILED: process_memory_write_job raised an exception: {e}', exc_info=True)
            finally:
                context.detach(token)
                
        asyncio.create_task(run_and_log_memory_job(job))
    except ImportError:
        logger.error(
            'cortex_healing not importable  document write job dropped. '
            'Ensure cortex_healing is installed as a path dependency in proxy-engine/pyproject.toml.'
        )

    return ToolCallResponse(id=request.id, result={'content': [{'type': 'text', 'text': 'Document ingestion queued successfully.'}], 'isError': False})



async def handle_fetch_document(
    request: ToolCallRequest,
    tenant_id: str,
    agent_id: str,
) -> ToolCallResponse:
    '''
    Accepts an external fetched document.
    Routes through egress sanitizer FIRST to simulate blocking malicious tool responses,
    then constructs a MemoryWriteJob (EXTERNAL_FETCH) if clean.
    '''
    content = request.params.get('arguments', {}).get('document_content', '')
    url = request.params.get('arguments', {}).get('document_url', '')

    # 1. Simulate egress sanitization on the fetched content
    mock_response = ToolCallResponse(id=request.id, result={'document_content': content, 'url': url})
    from ..egress.response_sanitizer import sanitize_tool_response
    safe_response = await sanitize_tool_response(mock_response, tenant_id, agent_id, 'fetch_document')
    
    # 2. Check if sanitizer blocked the content
    if safe_response.error or (safe_response.result and isinstance(safe_response.result, dict) and safe_response.result.get('isError')):
        # Rewrite the blocked message specifically for this scenario
        safe_response.result['content'][0]['text'] = 'EGRESS BLOCKED: Tool response contained injection attempt. Content quarantined.'
        return safe_response
        
    # 3. If clean, proceed to healing pipeline
    # The safe_response.result contains the (potentially redacted) content. 
    # For this simulation, we'll extract it back out.
    clean_content = safe_response.result.get('document_content', content) if isinstance(safe_response.result, dict) else content
    
    doc_id = str(uuid.uuid4())
    doc_hash = hashlib.sha256(clean_content.encode('utf-8')).hexdigest()

    job = MemoryWriteJob(
        tenant_id=tenant_id,
        agent_id=agent_id,
        raw_text=clean_content,
        origin_source=OriginSource.EXTERNAL_FETCH,
        submitted_at=datetime.utcnow(),
        doc_id=doc_id,
        document_hash=doc_hash,
        source_type="webpage",
        tool_name="fetch_document",
        request_id=str(request.id)
    )

    try:
        from cortex_healing.processor import process_memory_write_job
        
        ctx = context.get_current()
        async def run_and_log_memory_job(j: MemoryWriteJob):
            token = context.attach(ctx)
            try:
                with tracer.start_as_current_span('proxy.memory.ingest'):
                    await process_memory_write_job(j)
                logger.info(f'Successfully processed fetch_document job for tenant {j.tenant_id}')
            except Exception as e:
                logger.error(f'BACKGROUND TASK FAILED: process_memory_write_job raised an exception: {e}', exc_info=True)
            finally:
                context.detach(token)
                
        asyncio.create_task(run_and_log_memory_job(job))
    except ImportError:
        logger.error(
            'cortex_healing not importable  fetch_document job dropped.'
        )

    return ToolCallResponse(id=request.id, result={'content': [{'type': 'text', 'text': 'Document fetch and ingestion queued successfully.'}], 'isError': False})


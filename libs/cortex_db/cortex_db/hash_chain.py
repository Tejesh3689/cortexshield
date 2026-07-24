import hashlib
import json
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from cortex_db.models import AuditLogIndex

# =====================================================================================
# CRITICAL SAFETY NOTE:
# This helper is only race-safe under a single-concurrent-consumer guarantee.
# If the NATS consumer (audit.firewall_decisions) is ever scaled to multiple replicas,
# this must be revisited (e.g. via a Postgres advisory lock keyed by tenant_id, 
# or moving back to a DB-level trigger).
#
# The consumer MUST be configured with max_ack_pending=1 (or equivalent 
# durable consumer setting) to guarantee strictly serial processing per stream.
# =====================================================================================

async def append_audit_log(session: AsyncSession, tenant_id: str, event_type: str, event_ref: str, payload: dict) -> AuditLogIndex:
    # Fetch the most recent hash for this tenant
    stmt = select(AuditLogIndex).where(AuditLogIndex.tenant_id == tenant_id).order_by(AuditLogIndex.created_at.desc()).limit(1)
    result = await session.execute(stmt)
    last_log = result.scalar_one_or_none()
    
    prev_hash = last_log.this_hash if last_log else None
    
    # Serialize payload deterministically
    serialized_payload = json.dumps(payload, sort_keys=True)
    
    # Calculate this_hash = sha256(prev_hash + serialized_row_content)
    hash_input = f"{prev_hash or ''}|{tenant_id}|{event_type}|{event_ref}|{serialized_payload}"
    this_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()
    
    # Insert
    new_log = AuditLogIndex(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        event_type=event_type,
        event_ref=event_ref,
        prev_hash=prev_hash,
        this_hash=this_hash
    )
    
    session.add(new_log)
    await session.commit()
    await session.refresh(new_log)
    
    return new_log

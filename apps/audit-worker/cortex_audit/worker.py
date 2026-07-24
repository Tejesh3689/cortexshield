import asyncio
import os
import json
import logging
import nats
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from cortex_db.hash_chain import append_audit_log

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://cortex:localdevpassword@localhost:5432/cortexshield")
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def consume_audit_logs():
    nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    js = nc.jetstream()
    
    # CRITICAL: max_ack_pending=1 ensures strictly serial processing per stream.
    # This guarantees the application-layer hash-chaining logic in append_audit_log
    # is protected from race conditions where two concurrent consumers read the same prev_hash.
    sub = await js.subscribe(
        "audit.firewall_decisions",
        durable="audit_log_writer",
        config=nats.js.api.ConsumerConfig(
            max_ack_pending=1
        )
    )
    
    logger.info("Audit worker started listening to audit.firewall_decisions")
    
    async for msg in sub.messages:
        try:
            payload = json.loads(msg.data.decode())
            tenant_id = payload.get("tenant_id")
            event_type = payload.get("event_type", "FIREWALL_DECISION")
            event_ref = payload.get("event_ref", "decision")
            
            async with AsyncSessionLocal() as session:
                await append_audit_log(
                    session=session,
                    tenant_id=tenant_id,
                    event_type=event_type,
                    event_ref=event_ref,
                    payload=payload
                )
                
            await msg.ack()
        except Exception as e:
            logger.error(f"Error processing audit message: {e}")
            # Do not ack, let NATS redeliver

if __name__ == "__main__":
    asyncio.run(consume_audit_logs())

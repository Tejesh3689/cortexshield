"""
audit-worker/cortex_audit/worker.py — STUB for hackathon build.

In the full architecture, this worker subscribes to the NATS JetStream
"audit.firewall_decisions" subject (with max_ack_pending=1 to guarantee
strictly serial hash-chain appends — see docs/adr/0008-postgres-schema-and-hash-chain.md)
and persists each FirewallDecision to the append_audit_log hash-chain in Postgres.

HACKATHON SIMPLIFICATION (see docs/adr/0013-hackathon-nats-opa-removal.md):
NATS is removed. Audit log writes are currently omitted (firewall decisions
are logged to stderr by action_firewall.py). A direct Postgres insert via
append_audit_log() is the planned replacement — this is the correct insertion
point when restoring. The serial processing constraint (max_ack_pending=1) must
be preserved in any replacement to protect hash-chain integrity.
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def consume_audit_logs() -> None:
    """
    No-op stub. See module docstring for restoration instructions.
    """
    logger.warning(
        "audit-worker/consume_audit_logs is a no-op stub (NATS removed, ADR-0013). "
        "Audit log writes are not persisted in this build."
    )
    # Keep process alive in case it's started standalone
    while True:
        await asyncio.sleep(60)


if __name__ == "__main__":
    asyncio.run(consume_audit_logs())

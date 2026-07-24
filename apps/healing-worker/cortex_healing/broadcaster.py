"""
broadcaster.py — NATS-based graph update publisher. STUB for hackathon build.

In the full architecture, this module publishes node/edge change events to the
"graph.updates" NATS subject, which realtime-gateway subscribes to and relays
as WebSocket messages to portal-web.

HACKATHON SIMPLIFICATION (see docs/adr/0013-hackathon-nats-opa-removal.md):
NATS is removed. This function is a no-op stub. The realtime-gateway WebSocket
connection falls back gracefully when NEXT_PUBLIC_WS_URL is not set.
"""
import logging

logger = logging.getLogger(__name__)


async def broadcast_graph_update(tenant_id: str, update_type: str, data: dict) -> None:
    """
    Stub. In the full architecture, publishes to NATS "graph.updates" for
    realtime-gateway relay. No-op for hackathon build — see module docstring.
    """
    logger.debug(
        f"broadcast_graph_update called (no-op): tenant={tenant_id} type={update_type} "
        "(NATS disabled — ADR-0013)"
    )

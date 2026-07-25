"""
broadcaster.py — HTTP-based graph update publisher for realtime-gateway.

After every Neo4j write, contradiction_healer calls broadcast_graph_update()
which fires a POST to {REALTIME_GATEWAY_URL}/internal/graph-update (fire-and-forget,
0.1s timeout). If the gateway is down, the write continues normally.

Full architecture note: In the production build this would publish to NATS
"graph.updates" for the realtime-gateway subscriber. For the hackathon build
we call the gateway directly over HTTP — see docs/adr/0013-hackathon-nats-opa-removal.md.
"""
import logging
import os

logger = logging.getLogger(__name__)

REALTIME_GATEWAY_URL = os.getenv("REALTIME_GATEWAY_URL", "http://localhost:8200")


async def broadcast_graph_update(tenant_id: str, update_type: str, data: dict) -> None:
    """
    POST to /internal/graph-update on the realtime-gateway (fire-and-forget).
    Never raises — if the gateway is unreachable, healing continues normally.
    """
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{REALTIME_GATEWAY_URL}/internal/graph-update",
                json={"tenant_id": tenant_id, "event": update_type, "data": data},
                timeout=0.1,  # fire and forget — don't block healing
            )
        logger.debug(f"broadcast_graph_update: tenant={tenant_id} event={update_type}")
    except Exception as e:
        # Gateway down or slow — healing continues normally
        logger.debug(f"broadcast_graph_update failed (non-fatal): {e}")

import os
import json
import nats
import logging

logger = logging.getLogger(__name__)

async def broadcast_graph_update(tenant_id: str, update_type: str, data: dict):
    """
    Publishes node/edge changes to graph.updates so realtime-gateway can relay to portal-web.
    """
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        payload = {
            "tenant_id": tenant_id,
            "type": update_type,
            "data": data
        }
        await nc.publish("graph.updates", json.dumps(payload).encode())
        await nc.close()
    except Exception as e:
        logger.error(f"Failed to broadcast graph update to NATS: {e}")

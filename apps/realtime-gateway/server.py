import os
import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
# HACKATHON: nats import removed — see docs/adr/0013-hackathon-nats-opa-removal.md

# We should ideally use cortex_auth here, but we mock the JWT verify for the standalone file
# In a real setup: from cortex_auth import validate_browser_session

logger = logging.getLogger(__name__)

app = FastAPI()
nc = None

class ConnectionManager:
    def __init__(self):
        # tenant_id -> list of websockets
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        if tenant_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, tenant_id)

manager = ConnectionManager()

async def _nats_listener_stub():
    """
    HACKATHON STUB: In the full architecture, this subscribes to NATS "graph.updates"
    and calls manager.broadcast_to_tenant() per message.
    NATS removed — see docs/adr/0013-hackathon-nats-opa-removal.md.
    WebSocket connections are accepted but receive no push events in this build.
    """
    logger.warning(
        "realtime-gateway: NATS listener is disabled (hackathon build — ADR-0013). "
        "WebSocket connections are open but graph push events will not arrive."
    )

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(_nats_listener_stub())

@app.on_event("shutdown")
async def shutdown_event():
    pass  # No NATS connection to close

def validate_browser_session(token: str) -> str:
    """
    Validates a Clerk JWT. Extended cortex_auth mechanism.
    Returns the tenant_id.
    """
    # For now, blindly trust token for local dev, or extract unverified tenant.
    # A real implementation fetches Clerk JWKS.
    import jwt
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("org_id") or decoded.get("sub") or "default_tenant"
    except Exception:
        return "default_tenant"

@app.websocket("/ws/graph")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None), tenant: str = Query(None)):
    tenant_id = validate_browser_session(token) if token else tenant or "default_tenant"
    await manager.connect(websocket, tenant_id)
    try:
        while True:
            # We don't expect messages from client, but we must keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)

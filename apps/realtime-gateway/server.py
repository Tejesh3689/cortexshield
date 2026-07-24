import os
import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
import nats

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

async def nats_listener():
    global nc
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        
        async def message_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                tenant_id = data.get("tenant_id")
                if tenant_id:
                    await manager.broadcast_to_tenant(tenant_id, data)
            except Exception as e:
                logger.error(f"Error handling NATS graph update: {e}")
                
        await nc.subscribe("graph.updates", cb=message_handler)
    except Exception as e:
        logger.error(f"Failed to connect to NATS in realtime-gateway: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(nats_listener())

@app.on_event("shutdown")
async def shutdown_event():
    if nc and not nc.is_closed:
        await nc.close()

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

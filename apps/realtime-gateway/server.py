"""
CortexShield Realtime Gateway — WebSocket push server.
Port: 8200

Architecture:
  • POST /internal/graph-update  (internal, no auth)
      Receives graph write/heal/poison events from healing-worker and
      broadcasts them to all WebSocket clients for the given tenant.

  • WebSocket /ws/graph?api_key=<key>
      Accepts per-tenant WebSocket connections.
      Validates api_key via SHA-256 lookup in Postgres api_keys table.
      Falls back to JWT token (Clerk) if api_key is absent.
      Sends a 30-second ping frame to detect dead connections.
"""
import asyncio
import hashlib
import json
import logging
import os
import asyncpg
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("realtime-gateway")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:localdevpassword@localhost:5432/cortexshield",
)
PING_INTERVAL = int(os.getenv("WS_PING_INTERVAL", "30"))

# ── Connection Manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # tenant_id -> set of active WebSocket objects
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        self.active_connections.setdefault(tenant_id, set()).add(websocket)
        logger.info(f"WS connected: tenant={tenant_id} total={len(self.active_connections[tenant_id])}")

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        pool = self.active_connections.get(tenant_id)
        if pool:
            pool.discard(websocket)
            if not pool:
                del self.active_connections[tenant_id]
        logger.info(f"WS disconnected: tenant={tenant_id}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict) -> int:
        """Broadcast to all connections for a tenant. Returns number of recipients."""
        pool = self.active_connections.get(tenant_id, set())
        if not pool:
            return 0
        dead: list[WebSocket] = []
        sent = 0
        for ws in list(pool):
            try:
                await ws.send_json(message)
                sent += 1
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, tenant_id)
        return sent


manager = ConnectionManager()


# ── Postgres api_key validation ────────────────────────────────────

_pg_pool: Optional[asyncpg.Pool] = None


async def get_pg_pool() -> asyncpg.Pool:
    global _pg_pool
    if _pg_pool is None:
        # Convert SQLAlchemy-style URL to asyncpg DSN
        dsn = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://").replace(
            "postgresql://", "postgresql://"
        )
        _pg_pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)
    return _pg_pool


async def validate_api_key_pg(api_key: str) -> Optional[str]:
    """
    SHA-256 hash the api_key, look up in api_keys table.
    Returns tenant_id on success, None on failure.
    """
    key_hash = hashlib.sha256(api_key.strip().encode("utf-8")).hexdigest()
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT tenant_id FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL",
                key_hash,
            )
        return row["tenant_id"] if row else None
    except Exception as e:
        logger.error(f"Postgres api_key validation failed: {e}")
        return None


def _decode_jwt_tenant(token: str) -> str:
    """Decode a Clerk/WorkOS JWT without signature verification to extract tenant_id."""
    try:
        import jwt  # PyJWT
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("org_id") or decoded.get("sub") or "default_tenant"
    except Exception:
        return "default_tenant"


# ── 30-second ping loop ────────────────────────────────────────────

async def _ping_loop(websocket: WebSocket, tenant_id: str):
    """Send a WebSocket ping every PING_INTERVAL seconds to detect dead connections."""
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                manager.disconnect(websocket, tenant_id)
                break
    except asyncio.CancelledError:
        pass


# ── Lifespan ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Realtime Gateway starting on port 8200")
    yield
    # Close Postgres pool on shutdown
    global _pg_pool
    if _pg_pool:
        await _pg_pool.close()
    logger.info("Realtime Gateway shut down")


app = FastAPI(title="CortexShield Realtime Gateway", lifespan=lifespan)


# ── Internal push endpoint ─────────────────────────────────────────

class GraphUpdatePayload(BaseModel):
    tenant_id: str
    event: str  # "write" | "heal" | "poison"
    data: dict = {}


@app.post("/internal/graph-update")
async def internal_graph_update(payload: GraphUpdatePayload):
    """
    Internal-only endpoint (no auth). Receives a graph event from
    healing-worker/contradiction_healer and broadcasts it to all connected
    WebSocket clients for the given tenant.
    """
    message = {
        "type": "graph_update",
        "event": payload.event,
        "tenant_id": payload.tenant_id,
        "data": payload.data,
    }
    count = await manager.broadcast_to_tenant(payload.tenant_id, message)
    logger.info(f"graph-update broadcast: tenant={payload.tenant_id} event={payload.event} recipients={count}")
    return {"broadcast_count": count}


# ── WebSocket endpoint ─────────────────────────────────────────────

@app.websocket("/ws/graph")
async def websocket_endpoint(
    websocket: WebSocket,
    api_key: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    tenant: Optional[str] = Query(None),
):
    """
    WebSocket endpoint for real-time graph update push.

    Auth priority:
      1. api_key query param → SHA-256 → Postgres lookup → closes with 4001 if invalid
      2. token query param   → Clerk JWT decode (unverified, dev only)
      3. tenant query param  → trusted directly (dev fallback)
      4. defaults to "default_tenant"
    """
    tenant_id: Optional[str] = None

    if api_key:
        tenant_id = await validate_api_key_pg(api_key)
        if tenant_id is None:
            logger.warning(f"WS rejected: invalid api_key (hash checked)")
            await websocket.close(code=4001)
            return
    elif token:
        tenant_id = _decode_jwt_tenant(token)
    else:
        tenant_id = tenant or "default_tenant"

    await manager.connect(websocket, tenant_id)
    ping_task = asyncio.create_task(_ping_loop(websocket, tenant_id))

    try:
        while True:
            # Keep connection alive; clients don't need to send messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"WS closed unexpectedly: {e}")
    finally:
        ping_task.cancel()
        manager.disconnect(websocket, tenant_id)


# ── Health ─────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "realtime-gateway", "port": 8200}

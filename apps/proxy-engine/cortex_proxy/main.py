from contextlib import asynccontextmanager
import hashlib
from fastapi import FastAPI, Request, Header, HTTPException, Depends
from fastapi.responses import JSONResponse
import logging
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Load env vars before doing anything else
load_dotenv()

from .ingress.jsonrpc_interceptor import process_jsonrpc
from .db import get_db_session

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy-engine")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Proxy-Engine starting up...")
    yield
    logger.info("Proxy-Engine shutting down...")

app = FastAPI(title="CortexShield Proxy Engine", lifespan=lifespan)

async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db_session)
) -> bool:
    """
    Validates API key from Header (Authorization: Bearer <key>, X-API-Key) or Query Param (api_key, key).
    Queries the api_keys table in Postgres, compares against key_hash (SHA-256), and confirms revoked_at IS NULL.
    Returns 401 Unauthorized if the key doesn't match any active row.
    """
    api_key = request.headers.get("x-api-key") or request.headers.get("api-key")
    if not api_key:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            api_key = auth_header[7:].strip()
    if not api_key:
        api_key = request.query_params.get("api_key") or request.query_params.get("key")

    if not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized: Missing API key")

    key_hash = hashlib.sha256(api_key.strip().encode("utf-8")).hexdigest()

    result = await db.execute(
        text("SELECT id FROM api_keys WHERE key_hash = :key_hash AND revoked_at IS NULL"),
        {"key_hash": key_hash}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or revoked API key")
    return True

@app.post("/v1/tools/call")
@app.post("/rpc")
async def handle_tool_call(
    request: Request,
    tenant_id: str = Header(..., alias="x-tenant-id"),
    agent_id: str = Header(..., alias="x-agent-id"),
    _auth: bool = Depends(verify_api_key)
):
    """
    Main ingress endpoint for intercepting tool calls (JSON-RPC format).
    Requires active, non-revoked API key in database and x-tenant-id / x-agent-id headers.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        response_dict = await process_jsonrpc(data, tenant_id, agent_id)
        return JSONResponse(content=response_dict)
    except Exception as e:
        logger.error(f"Error processing JSON-RPC: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"jsonrpc": "2.0", "error": {"code": -32603, "message": "Internal error"}, "id": data.get("id")}
        )

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "proxy-engine"}

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Header, HTTPException, Query
from fastapi.responses import JSONResponse
import logging
from dotenv import load_dotenv

# Load env vars before doing anything else
load_dotenv()

from .ingress.jsonrpc_interceptor import process_jsonrpc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy-engine")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Proxy-Engine starting up...")
    yield
    logger.info("Proxy-Engine shutting down...")

app = FastAPI(title="CortexShield Proxy Engine", lifespan=lifespan)

@app.post("/v1/tools/call")
@app.post("/rpc")
async def handle_tool_call(
    request: Request,
    header_tenant_id: str = Header(None, alias="x-tenant-id"),
    header_agent_id: str = Header(None, alias="x-agent-id"),
    query_tenant_id: str = Query(None, alias="tenant_id"),
    query_agent_id: str = Query(None, alias="agent_id"),
    authorization: str = Header(None),
    api_key: str = Query(None)
):
    # Fallback logic for tenant and agent IDs
    tenant_id = query_tenant_id or header_tenant_id
    agent_id = query_agent_id or header_agent_id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant_id (header or query)")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Missing agent_id (header or query)")
    # Hackathon workaround: accept API key in query param or Authorization header
    token = api_key
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
    if not token or not token.startswith("sk_pro_"):
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing API key")
    """
    Main ingress endpoint for intercepting tool calls (JSON-RPC format).
    Requires x-tenant-id and x-agent-id headers.
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

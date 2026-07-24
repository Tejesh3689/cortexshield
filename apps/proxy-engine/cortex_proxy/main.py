from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Header, HTTPException
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
    tenant_id: str = Header(..., alias="x-tenant-id"),
    agent_id: str = Header(..., alias="x-agent-id")
):
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

from contextlib import asynccontextmanager
import hashlib
import os
import uuid
from fastapi import FastAPI, Request, Header, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from neo4j import GraphDatabase

# Load env vars before doing anything else
from pathlib import Path
service_dir = Path(__file__).resolve().parent.parent
repo_root = service_dir.parent.parent
load_dotenv(repo_root / ".env")
load_dotenv(service_dir / ".env", override=True)

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
    header_tenant_id: str = Header(None, alias="x-tenant-id"),
    header_agent_id: str = Header(None, alias="x-agent-id"),
    query_tenant_id: str = Query(None, alias="tenant_id"),
    query_agent_id: str = Query(None, alias="agent_id"),
    _auth: bool = Depends(verify_api_key)
):
    # Fallback logic for tenant and agent IDs
    tenant_id = query_tenant_id or header_tenant_id
    agent_id = query_agent_id or header_agent_id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant_id (header or query)")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Missing agent_id (header or query)")

    """
    Main ingress endpoint for intercepting tool calls (JSON-RPC format).
    Requires active, non-revoked API key in database and x-tenant-id / x-agent-id headers or query parameters.
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


# ── Remediation Endpoint ──────────────────────────────────────────────────────

class HealRequest(BaseModel):
    edge_element_id: str

@app.post("/api/graph/heal")
async def heal_edge(
    body: HealRequest,
    header_tenant_id: str = Header(None, alias="x-tenant-id"),
    header_agent_id: str = Header(None, alias="x-agent-id"),
    query_tenant_id: str = Query(None, alias="tenant_id"),
    query_agent_id: str = Query(None, alias="agent_id"),
    db: AsyncSession = Depends(get_db_session),
    _auth: bool = Depends(verify_api_key)
):
    """
    Administrative override: marks a specific Neo4j relationship as SUPERSEDED
    by its elementId. Intended for the 'Remediate Poisoned Edge' demo button.
    """
    tenant_id = query_tenant_id or header_tenant_id
    agent_id = query_agent_id or header_agent_id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant_id (header or query)")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Missing agent_id (header or query)")

    edge_id = body.edge_element_id.strip()
    logger.info(f"heal_edge called for elementId={edge_id!r}")

    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    if neo4j_uri.startswith("neo4j+s://"):
        neo4j_uri = neo4j_uri.replace("neo4j+s://", "neo4j+ssc://", 1)

    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "localdevpassword")

    try:
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        with driver.session() as session:
            # 1. Check if edge exists and belongs to tenant
            check_result = session.run(
                """
                MATCH (s)-[r]->() WHERE elementId(r) = $edge_element_id
                RETURN s.tenant_id AS edge_tenant
                """,
                edge_element_id=edge_id
            )
            check_record = check_result.single()
            
            if check_record is None:
                driver.close()
                raise HTTPException(status_code=404, detail=f"No relationship found with elementId '{edge_id}'")
            
            if check_record["edge_tenant"] != tenant_id:
                driver.close()
                raise HTTPException(status_code=403, detail="Edge belongs to a different tenant")

            # 2. Update edge status
            result = session.run(
                """
                MATCH ()-[r]->() WHERE elementId(r) = $edge_element_id
                AND EXISTS { MATCH (s {tenant_id: $tenant_id})-[r]->() }
                SET r.status = 'SUPERSEDED', r.superseded_at = datetime(),
                    r.healed_by = $agent_id
                RETURN r.status AS new_status
                """,
                edge_element_id=edge_id,
                tenant_id=tenant_id,
                agent_id=agent_id
            )
            record = result.single()
        driver.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Neo4j error in heal_edge: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Neo4j error: {str(e)}")

    if record is None:
        raise HTTPException(status_code=500, detail="Update failed unexpectedly")

    # 3. Write to Postgres audit_log_index
    try:
        event_id = str(uuid.uuid4())
        this_hash = hashlib.sha256(f"manual_heal:{edge_id}:{tenant_id}".encode()).hexdigest()
        await db.execute(
            text("""
            INSERT INTO audit_log_index (id, tenant_id, event_type, event_ref, this_hash)
            VALUES (:id, :tenant_id, 'manual_heal', :edge_element_id, :this_hash)
            """),
            {"id": event_id, "tenant_id": tenant_id, "edge_element_id": edge_id, "this_hash": this_hash}
        )
        await db.commit()
        logger.info(f"heal_edge: audit row written id={event_id}")
    except Exception as e:
        logger.error(f"Postgres error in heal_edge audit log: {e}", exc_info=True)
        # Do not fail the request if audit logging fails

    logger.info(f"heal_edge: elementId={edge_id!r} -> new_status={record['new_status']}")
    return {"success": True, "new_status": record["new_status"]}


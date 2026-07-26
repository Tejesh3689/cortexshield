from contextlib import asynccontextmanager
import hashlib
import os
import uuid
from fastapi import FastAPI, Request, Header, HTTPException, Depends, Query, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging
import time
import redis.asyncio as aioredis
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from neo4j import GraphDatabase

# Load env vars before doing anything else
from pathlib import Path
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
service_dir = Path(__file__).resolve().parent.parent
repo_root = service_dir.parent.parent
load_dotenv(repo_root / ".env")
load_dotenv(service_dir / ".env", override=True)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .ingress.jsonrpc_interceptor import process_jsonrpc
from .db import get_db_session
from .compliance.router import router as compliance_router
from .alerts.router import router as alerts_router
from .agents.router import router as agents_router
from .tasks.sleeper_detection import detect_sleeper_attacks
from .tasks.behavior_profiler import profile_all_agents

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("proxy-engine")

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Proxy-Engine starting up...")
    scheduler.add_job(detect_sleeper_attacks, 'interval', minutes=30)
    scheduler.add_job(profile_all_agents, 'interval', hours=1)
    scheduler.start()
    yield
    scheduler.shutdown()
    logger.info("Proxy-Engine shutting down...")

app = FastAPI(title="CortexShield Proxy Engine", lifespan=lifespan)
app.include_router(compliance_router, prefix="/v1/compliance")
app.include_router(alerts_router, prefix="/v1/alerts")
app.include_router(agents_router, prefix="/v1/agents")

# --- OpenTelemetry & Prometheus Setup ---
resource = Resource(attributes={"service.name": "proxy-engine"})
trace_provider = TracerProvider(resource=resource)
otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
if otlp_endpoint:
    exporter = OTLPSpanExporter(endpoint=f"{otlp_endpoint}/v1/traces")
else:
    exporter = ConsoleSpanExporter()
trace_provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("proxy-engine")

REQ_TOTAL = Counter("cortexshield_requests_total", "Total requests", ["tenant_id", "tool_name", "decision"])
REQ_DURATION = Histogram("cortexshield_request_duration_ms", "Request duration ms")
POISON_TOTAL = Counter("cortexshield_poison_detections_total", "Poison detections", ["tenant_id"])
DENY_TOTAL = Counter("cortexshield_firewall_denials_total", "Firewall denials", ["tenant_id", "tool_name"])

class OTelMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/rpc") and not request.url.path.startswith("/v1/tools/call"):
            return await call_next(request)
            
        request.state.start_time = time.time()
        with tracer.start_as_current_span("proxy.request") as span:
            request.state.proxy_span = span
            return await call_next(request)

app.add_middleware(OTelMiddleware)

redis_client = aioredis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"), decode_responses=True, health_check_interval=30, socket_keepalive=True)

async def check_rate_limit(request: Request, response: Response, db: AsyncSession = Depends(get_db_session)):
    api_key = request.headers.get("x-api-key") or request.headers.get("api-key")
    if not api_key:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            api_key = auth_header[7:].strip()
    if not api_key:
        api_key = request.query_params.get("api_key") or request.query_params.get("key")

    if not api_key:
        return  # Let auth handle missing key

    key_hash = hashlib.sha256(api_key.strip().encode("utf-8")).hexdigest()

    result = await db.execute(
        text("SELECT t.tier FROM tenants t JOIN api_keys a ON t.id = a.tenant_id WHERE a.key_hash = :key_hash AND a.revoked_at IS NULL"),
        {"key_hash": key_hash}
    )
    row = result.fetchone()
    if not row:
        return  # Let auth handle invalid key

    tier = row[0]
    if tier == "enterprise":
        limit = -1
    elif tier == "growth":
        limit = 1000
    else:
        limit = 100

    if limit == -1:
        return

    current_minute = int(time.time() // 60)
    redis_key = f"rate_limit:{key_hash}:{current_minute}"

    try:
        async with redis_client.pipeline(transaction=True) as pipe:
            pipe.incr(redis_key)
            pipe.expire(redis_key, 60)
            res = await pipe.execute()
    except Exception as e:
        logger.warning(f"Rate limiter failed: {e}")
        return

    current_count = res[0]
    remaining = max(0, limit - current_count)

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)

    if current_count > limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining)
            }
        )

async def verify_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db_session)
) -> str:
    """
    Validates API key from Header (Authorization: Bearer <key>, X-API-Key) or Query Param (api_key, key).
    Queries the api_keys table in Postgres, compares against key_hash (SHA-256), and confirms revoked_at IS NULL.
    Returns 401 Unauthorized if the key doesn't match any active row.
    """
    with tracer.start_as_current_span("proxy.auth") as span:
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
            text("SELECT id, tenant_id FROM api_keys WHERE key_hash = :key_hash AND revoked_at IS NULL"),
            {"key_hash": key_hash}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid or revoked API key")
        span.set_attribute("tenant_id", row[1])
        return row[1]  # Return the tenant_id

@app.post("/v1/tools/call")
@app.post("/rpc")
async def handle_tool_call(
    request: Request,
    header_tenant_id: str = Header(None, alias="x-tenant-id"),
    header_agent_id: str = Header(None, alias="x-agent-id"),
    query_tenant_id: str = Query(None, alias="tenant_id"),
    query_agent_id: str = Query(None, alias="agent_id"),
    _rate_limit: None = Depends(check_rate_limit),
    db_tenant_id: str = Depends(verify_api_key),
    db: AsyncSession = Depends(get_db_session)
):
    # Fallback logic for tenant and agent IDs
    caller_tenant_id = query_tenant_id or header_tenant_id
    if caller_tenant_id and caller_tenant_id != db_tenant_id:
        logger.warning(f"Caller supplied tenant_id {caller_tenant_id} does not match DB tenant_id {db_tenant_id}. Forcing DB tenant_id.")
        
    tenant_id = db_tenant_id
    agent_id = query_agent_id or header_agent_id
    
    # We no longer check if tenant_id is missing since db_tenant_id is guaranteed by verify_api_key
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
        
        tool_name = data.get("params", {}).get("name", "unknown")
        
        if hasattr(request.state, "proxy_span"):
            request.state.proxy_span.set_attribute("tenant_id", tenant_id)
            request.state.proxy_span.set_attribute("tool_name", tool_name)
            
        is_memory = 1 if tool_name in ("add_memory", "process_document", "fetch_document") else 0
        
        is_deny = 0
        is_poison = 0
        result_content = response_dict.get("result", {}).get("content", [])
        if result_content and isinstance(result_content, list) and len(result_content) > 0:
            text_resp = result_content[0].get("text", "")
            if "FIREWALL DENY:" in text_resp:
                is_deny = 1
            if "EGRESS BLOCKED:" in text_resp:
                is_poison = 1

        upsert_query = text("""
            INSERT INTO usage_counters (tenant_id, period_start, operation_count, tool_call_count, memory_write_count, firewall_deny_count, poison_detection_count)
            VALUES (:tenant_id, date_trunc('hour', now()), 1, 1, :is_memory, :is_deny, :is_poison)
            ON CONFLICT (tenant_id, period_start)
            DO UPDATE SET
                operation_count = usage_counters.operation_count + 1,
                tool_call_count = usage_counters.tool_call_count + 1,
                memory_write_count = usage_counters.memory_write_count + EXCLUDED.memory_write_count,
                firewall_deny_count = usage_counters.firewall_deny_count + EXCLUDED.firewall_deny_count,
                poison_detection_count = usage_counters.poison_detection_count + EXCLUDED.poison_detection_count;
        """)
        await db.execute(upsert_query, {
            "tenant_id": tenant_id,
            "is_memory": is_memory,
            "is_deny": is_deny,
            "is_poison": is_poison
        })
        await db.commit()
        
        # Publish behavioral event
        try:
            tool_args_raw = data.get("params", {}).get("arguments", {})
            import json
            content_len = len(json.dumps(tool_args_raw)) if isinstance(tool_args_raw, dict) else len(str(tool_args_raw))
            await redis_client.xadd(
                f"behavior:{tenant_id}:{agent_id}",
                {
                    "tool_name": tool_name,
                    "content_length": content_len,
                    "timestamp": datetime.utcnow().isoformat(),
                    "request_id": str(data.get("id", "unknown"))
                },
                maxlen=10000
            )
        except Exception as e:
            logger.warning(f"Failed to record behavior event: {e}")
        # Prometheus metrics
        decision = "DENY" if is_deny else "ALLOW"
        if is_deny:
            DENY_TOTAL.labels(tenant_id=tenant_id, tool_name=tool_name).inc()
        if is_poison:
            POISON_TOTAL.labels(tenant_id=tenant_id).inc()
        REQ_TOTAL.labels(tenant_id=tenant_id, tool_name=tool_name, decision=decision).inc()
        
        if hasattr(request.state, "start_time"):
            REQ_DURATION.observe((time.time() - request.state.start_time) * 1000.0)

        return JSONResponse(content=response_dict)
    except Exception as e:
        logger.error(f"Error processing JSON-RPC: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"jsonrpc": "2.0", "error": {"code": -32603, "message": "Internal error"}, "id": data.get("id")}
        )

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db_session)):
    import asyncio
    health_status = {"status": "healthy", "postgres": "error", "neo4j": "error", "redis": "error"}
    
    # 1. Check Redis
    try:
        await redis_client.ping()
        health_status["redis"] = "ok"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["status"] = "unhealthy"

    # 2. Check Postgres
    try:
        await db.execute(text("SELECT 1"))
        health_status["postgres"] = "ok"
    except Exception as e:
        logger.error(f"Postgres health check failed: {e}")
        health_status["status"] = "unhealthy"

    # 3. Check Neo4j
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    if neo4j_uri.startswith("neo4j+s://"):
        neo4j_uri = neo4j_uri.replace("neo4j+s://", "neo4j+ssc://", 1)
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "localdevpassword")

    try:
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        await asyncio.to_thread(driver.verify_connectivity)
        driver.close()
        health_status["neo4j"] = "ok"
    except Exception as e:
        logger.error(f"Neo4j health check failed: {e}")
        health_status["status"] = "unhealthy"

    status_code = 200 if health_status["status"] == "healthy" else 503
    return JSONResponse(status_code=status_code, content=health_status)

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.websocket("/ws/graph")
async def websocket_endpoint(websocket: WebSocket, tenant: str = Query(None)):
    await websocket.accept()
    try:
        while True:
            # Just keep the connection alive. In a real system, you would 
            # broadcast {"type": "graph_update"} when Neo4j changes occur.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass

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
    _rate_limit: None = Depends(check_rate_limit),
    _db_tenant_id: str = Depends(verify_api_key)
):
    """
    Administrative override: marks a specific Neo4j relationship as SUPERSEDED
    by its elementId. Intended for the 'Remediate Poisoned Edge' demo button.
    """
    tenant_id = query_tenant_id or header_tenant_id or _db_tenant_id
    agent_id = query_agent_id or header_agent_id or "portal-dashboard"
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Missing agent_id")

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


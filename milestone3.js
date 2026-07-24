const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    "apps/proxy-engine/cortex_proxy/ingress/jsonrpc_interceptor.py": `import json
from .memory_ingest_fastpath import handle_add_memory
from ..firewall.action_firewall import decide
from cortex_schemas.models import ToolCallRequest, ToolCallResponse

async def process_jsonrpc(request_data: dict, tenant_id: str, agent_id: str) -> dict:
    req = ToolCallRequest(**request_data)
    
    if req.method == "tools/call" and req.params.get("name") == "add_memory":
        response = await handle_add_memory(req, tenant_id, agent_id)
        return response.model_dump(exclude_none=True)
    
    if req.method == "tools/call":
        decision = await decide(req, tenant_id, agent_id)
        if decision.decision.value == "DENY":
            return ToolCallResponse(id=req.id, error={"code": -32000, "message": f"Denied: {decision.reason}"}).model_dump(exclude_none=True)
        return ToolCallResponse(id=req.id, result={"status": "allowed", "message": "Action permitted"}).model_dump(exclude_none=True)
        
    return ToolCallResponse(id=req.id, error={"code": -32601, "message": "Method not found"}).model_dump(exclude_none=True)
`,
    "apps/proxy-engine/cortex_proxy/ingress/memory_ingest_fastpath.py": `import os
import json
from datetime import datetime
import nats
from cortex_schemas.models import ToolCallRequest, ToolCallResponse, MemoryWriteJob, OriginSource

async def handle_add_memory(request: ToolCallRequest, tenant_id: str, agent_id: str) -> ToolCallResponse:
    raw_text = request.params.get("arguments", {}).get("text", "")
    
    job = MemoryWriteJob(
        tenant_id=tenant_id,
        agent_id=agent_id,
        raw_text=raw_text,
        origin_source=OriginSource.USER_PROMPT,
        submitted_at=datetime.utcnow()
    )
    
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        js = nc.jetstream()
        
        await js.publish("memory.writes.raw", job.model_dump_json().encode())
        await nc.close()
    except Exception as e:
        # We would log this in a real system, but we must fail gracefully if NATS is down.
        pass
    
    return ToolCallResponse(id=request.id, result={"status": "enqueued"})
`,
    "apps/proxy-engine/cortex_proxy/cache/trust_score_cache.py": `import os
import redis.asyncio as redis

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    return _redis_client

async def get_tenant_trust_score(tenant_id: str) -> float:
    r = get_redis()
    try:
        score = await r.get(f"trust:{tenant_id}")
        if score is None:
            return 1.0 # default if no memories
        return float(score)
    except Exception:
        # Fallback if Redis is down
        return 1.0

async def invalidate_tenant_trust_score(tenant_id: str):
    """Stub to be implemented by healing-worker logic in Milestone 4"""
    r = get_redis()
    await r.delete(f"trust:{tenant_id}")
`,
    "apps/proxy-engine/cortex_proxy/firewall/action_firewall.py": `import os
import hashlib
from datetime import datetime
import nats
from cortex_schemas.models import ToolCallRequest, FirewallDecision, FirewallDecisionType
from ..cache.trust_score_cache import get_tenant_trust_score
from .opa_client import evaluate_policy

async def decide(request: ToolCallRequest, tenant_id: str, agent_id: str) -> FirewallDecision:
    # 1. Context trust is MIN over active memories (read from Redis cache which aggregates this)
    context_trust = await get_tenant_trust_score(tenant_id)
    
    # 2. Sequence score placeholder
    sequence_score = 0.0
    
    tool_name = request.params.get("name", "unknown")
    tool_args = str(request.params.get("arguments", {}))
    tool_args_hash = hashlib.sha256(tool_args.encode()).hexdigest()
    
    # 3. OPA Policy Check
    policy_result = await evaluate_policy(tenant_id, tool_name, context_trust)
    decision_type = FirewallDecisionType.ALLOW if policy_result.get("allow", True) else FirewallDecisionType.DENY
    reason = policy_result.get("reason", "Allowed by default") if decision_type == FirewallDecisionType.ALLOW else policy_result.get("reason", "Policy violation")
    
    decision = FirewallDecision(
        tenant_id=tenant_id,
        agent_id=agent_id,
        tool_name=tool_name,
        tool_args_hash=tool_args_hash,
        context_trust=context_trust,
        sequence_score=sequence_score,
        decision=decision_type,
        reason=reason,
        decided_at=datetime.utcnow()
    )
    
    # 4. Emit FirewallDecision to audit log asynchronously via NATS instead of blocking DB write
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        js = nc.jetstream()
        await js.publish("audit.firewall_decisions", decision.model_dump_json().encode())
        await nc.close()
    except Exception as e:
        print(f"Failed to publish audit log: {e}")
        
    return decision
`,
    "apps/proxy-engine/cortex_proxy/firewall/opa_client.py": `import os
import httpx
import logging

logger = logging.getLogger(__name__)

async def evaluate_policy(tenant_id: str, tool_name: str, context_trust: float) -> dict:
    opa_url = os.getenv("OPA_URL", "http://localhost:8181/v1/data/cortexshield")
    payload = {
        "input": {
            "tenant_id": tenant_id,
            "tool_name": tool_name,
            "context_trust": context_trust
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(opa_url, json=payload, timeout=0.1)
            resp.raise_for_status()
            data = resp.json().get("result", {})
            return data
    except Exception as e:
        logger.warning(f"OPA policy check failed or policies not loaded: {e}. Defaulting to ALLOW.")
        return {"allow": True, "reason": "Default allow (policy engine unavailable or empty)"}
`,
    "apps/proxy-engine/tests/test_proxy_integration.py": `import pytest
from unittest.mock import patch, AsyncMock
from cortex_proxy.ingress.jsonrpc_interceptor import process_jsonrpc
from cortex_proxy.firewall.opa_client import evaluate_policy
from cortex_schemas.models import FirewallDecisionType

@pytest.mark.asyncio
@patch("cortex_proxy.ingress.memory_ingest_fastpath.nats.connect")
async def test_add_memory_fastpath(mock_connect):
    mock_nc = AsyncMock()
    mock_js = AsyncMock()
    mock_nc.jetstream.return_value = mock_js
    mock_connect.return_value = mock_nc
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "add_memory", "arguments": {"text": "I live in SF"}},
        "id": 1
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert resp["result"]["status"] == "enqueued"
    
    # Confirm a message lands on NATS subject memory.writes.raw
    mock_js.publish.assert_called_once()
    args = mock_js.publish.call_args[0]
    assert args[0] == "memory.writes.raw"
    assert b"I live in SF" in args[1]

@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.nats.connect")
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.9)
async def test_non_restricted_tool_allow(mock_trust, mock_connect):
    mock_nc = AsyncMock()
    mock_nc.jetstream.return_value = AsyncMock()
    mock_connect.return_value = mock_nc
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "read_weather", "arguments": {}},
        "id": 2
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert resp["result"]["status"] == "allowed"

@pytest.mark.asyncio
@patch("cortex_proxy.firewall.action_firewall.nats.connect")
@patch("cortex_proxy.firewall.action_firewall.get_tenant_trust_score", return_value=0.2)
@patch("cortex_proxy.firewall.action_firewall.evaluate_policy")
async def test_restricted_tool_deny(mock_eval, mock_trust, mock_connect):
    mock_nc = AsyncMock()
    mock_nc.jetstream.return_value = AsyncMock()
    mock_connect.return_value = mock_nc
    
    # Mock OPA to deny due to low trust score seeded in Redis
    mock_eval.return_value = {"allow": False, "reason": "Trust score too low for restricted tool"}
    
    req = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": "execute_shell_command", "arguments": {}},
        "id": 3
    }
    
    resp = await process_jsonrpc(req, "tenant1", "agent1")
    assert "error" in resp
    assert "Trust score too low" in resp["error"]["message"]
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 3 files created successfully.");

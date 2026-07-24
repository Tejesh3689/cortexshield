import os
import hashlib
from datetime import datetime
import nats
import httpx
import logging
from prometheus_client import Counter
from cortex_schemas.models import ToolCallRequest, FirewallDecision, FirewallDecisionType
from ..cache.trust_score_cache import get_tenant_trust_score
from .opa_client import evaluate_policy

logger = logging.getLogger(__name__)

# Prometheus metric for fail-open tracking
FAIL_OPEN_COUNTER = Counter(
    'anomaly_service_fail_open_total', 
    'Number of times the anomaly service was unreachable or too slow, causing a fail-open',
    ['tenant_id']
)

async def get_sequence_score(tenant_id: str, agent_id: str, tool_name: str) -> float:
    url = os.getenv("ANOMALY_SERVICE_URL", "http://localhost:8001/score")
    payload = {
        "tenant_id": tenant_id,
        "agent_id": agent_id,
        "tool_name": tool_name
    }
    
    try:
        # Strict 5ms timeout on the hot path
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=0.005)
            resp.raise_for_status()
            return resp.json().get("sequence_score", 0.0)
    except Exception as e:
        # Fail-open: not silent. Increment metric and log as WARN.
        FAIL_OPEN_COUNTER.labels(tenant_id=tenant_id).inc()
        logger.warning(
            f"Anomaly service unreachable or slow for tenant {tenant_id} (error: {e}). "
            f"Failing open with sequence_score=0.0. TC-3-style sequence attacks are NOT caught during this window."
        )
        return 0.0

async def decide(request: ToolCallRequest, tenant_id: str, agent_id: str) -> FirewallDecision:
    # 1. Context trust is MIN over active memories
    context_trust = await get_tenant_trust_score(tenant_id)
    
    tool_name = request.params.get("name", "unknown")
    tool_args = str(request.params.get("arguments", {}))
    tool_args_hash = hashlib.sha256(tool_args.encode()).hexdigest()
    
    # 2. Sequence score from Anomaly Service
    sequence_score = await get_sequence_score(tenant_id, agent_id, tool_name)
    
    # 3. OPA Policy Check
    policy_result = await evaluate_policy(tenant_id, tool_name, context_trust)
    decision_type = FirewallDecisionType.ALLOW if policy_result.get("allow", True) else FirewallDecisionType.DENY
    reason = policy_result.get("reason", "Allowed by default") if decision_type == FirewallDecisionType.ALLOW else policy_result.get("reason", "Policy violation")
    
    # If sequence score is extremely high (anomaly), we can override to DENY.
    # In a full setup, OPA would use the sequence_score in the rule evaluation.
    if sequence_score > 0.9 and decision_type == FirewallDecisionType.ALLOW:
        decision_type = FirewallDecisionType.DENY
        reason = "Sequence anomaly detected (TC-3 mitigation)"
    
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
    
    # 4. Emit FirewallDecision to audit log asynchronously via NATS
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        js = nc.jetstream()
        await js.publish("audit.firewall_decisions", decision.model_dump_json().encode())
        await nc.close()
    except Exception as e:
        logger.error(f"Failed to publish audit log: {e}")
        
    return decision

"""
Action Firewall — ingress decision engine for tools/call requests.

OPA NOTE: In the full architecture, policy decisions are delegated to the OPA
policy-service via cortex_proxy.firewall.opa_client (Rego-based rules, per-tenant
overrides, JetStream audit emission). See docs/adr/0013-hackathon-nats-opa-removal.md.

HACKATHON SIMPLIFICATION: OPA is replaced by a Python allowlist/denylist evaluated
inline. The NATS audit publish step is omitted (Postgres direct write is the
planned replacement; currently skipped to remove the broker dependency).

The sequence-score anomaly override (TC-3 mitigation) is pure Python and is retained
unchanged — it does not depend on OPA or NATS.
"""
import os
import hashlib
import logging
from datetime import datetime
import httpx
import redis.asyncio as aioredis
from prometheus_client import Counter
from cortex_schemas.models import ToolCallRequest, FirewallDecision, FirewallDecisionType
from ..cache.trust_score_cache import get_tenant_trust_score

_redis_client: aioredis.Redis | None = None

def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379/0")
        )
    return _redis_client

async def _check_overlimit(tenant_id: str) -> bool:
    """Returns True if billing has flagged this tenant as over their tier limit."""
    try:
        r = _get_redis()
        result = await r.get(f"overlimit:{tenant_id}")
        return result is not None
    except Exception as e:
        logger.debug(f"overlimit Redis check failed (fail-open): {e}")
        return False  # fail-open: don't block if Redis is down

logger = logging.getLogger(__name__)

FAIL_OPEN_COUNTER = Counter(
    "anomaly_service_fail_open_total",
    "Number of times the anomaly service was unreachable or too slow, causing a fail-open",
    ["tenant_id"],
)

# Python-native denylist. In the full OPA architecture this is expressed as
# a Rego policy with per-tenant overrides. Restored post-hackathon.
FIREWALL_DEFAULT_RESTRICTED_TOOLS = frozenset(
    os.getenv(
        "FIREWALL_DEFAULT_RESTRICTED_TOOLS",
        "exec_shell,write_file,delete_file,send_email,make_payment",
    ).split(",")
)


async def get_sequence_score(tenant_id: str, agent_id: str, tool_name: str) -> dict:
    """Returns {sequence_score, is_anomaly, reason} from the anomaly service."""
    url = os.getenv("ANOMALY_SERVICE_URL")
    if not url:
        logger.warning(
            "ANOMALY_SERVICE_URL not set — skipping sequence score check. "
            "TC-3 sequence attacks will NOT be caught until this is configured."
        )
        return {"sequence_score": 0.0, "is_anomaly": False, "reason": "service not configured"}

    payload = {"tenant_id": tenant_id, "agent_id": agent_id, "tool_name": tool_name}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=0.05)  # 50ms — local service
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        FAIL_OPEN_COUNTER.labels(tenant_id=tenant_id).inc()
        logger.warning(
            f"Anomaly service unreachable or slow for tenant {tenant_id} (error: {e}). "
            "Failing open. TC-3-style sequence attacks are NOT caught during this window."
        )
        return {"sequence_score": 0.0, "is_anomaly": False, "reason": "service unreachable"}


from sqlalchemy.ext.asyncio import AsyncSession
from cortex_db.hash_chain import append_audit_log

async def decide(request: ToolCallRequest, tenant_id: str, agent_id: str, session: AsyncSession = None) -> FirewallDecision:
    """
    Evaluate a tool call request and return a FirewallDecision.

    Enforcement order:
      0. Billing overlimit check (Redis key overlimit:{tenant_id}) → 402 if set.
      1. Context trust from Redis-cached trust score (minimum over active memories).
      2. Anomaly sequence score from anomaly-service (fail-open if unavailable).
      3. Python denylist (FIREWALL_DEFAULT_RESTRICTED_TOOLS env var).
      4. Sequence-score override: if rolling score < 0.1, deny regardless of denylist.
    """
    # ── 0. Billing overlimit check ─────────────────────────────────────────────
    if await _check_overlimit(tenant_id):
        logger.warning(f"BLOCKED: tenant={tenant_id} is over their tier limit (overlimit Redis key set)")
        return FirewallDecision(
            tenant_id=tenant_id,
            agent_id=agent_id,
            tool_name=request.params.get("name", "unknown"),
            tool_args_hash=hashlib.sha256(str(request.params.get("arguments", {})).encode()).hexdigest(),
            context_trust=0.0,
            sequence_score=0.0,
            decision=FirewallDecisionType.DENY,
            reason="402 Payment Required: tenant has exceeded their tier operation limit",
            decided_at=datetime.utcnow(),
        )

    context_trust = await get_tenant_trust_score(tenant_id)

    tool_name = request.params.get("name", "unknown")
    tool_args = str(request.params.get("arguments", {}))
    tool_args_hash = hashlib.sha256(tool_args.encode()).hexdigest()

    # Anomaly score — returns full dict with is_anomaly flag
    anomaly_result = await get_sequence_score(tenant_id, agent_id, tool_name)
    sequence_score = anomaly_result.get("sequence_score", 0.0)
    is_anomaly = anomaly_result.get("is_anomaly", False)
    anomaly_reason = anomaly_result.get("reason", "")

    # Python-native policy evaluation (replaces OPA for hackathon)
    if tool_name in FIREWALL_DEFAULT_RESTRICTED_TOOLS:
        decision_type = FirewallDecisionType.DENY
        reason = f"Tool '{tool_name}' is in the restricted denylist (FIREWALL_DEFAULT_RESTRICTED_TOOLS)"
    else:
        decision_type = FirewallDecisionType.ALLOW
        reason = "Allowed — not in restricted tool denylist"

    # Sequence anomaly override (TC-3 mitigation)
    if is_anomaly and decision_type == FirewallDecisionType.ALLOW:
        decision_type = FirewallDecisionType.DENY
        reason = f"BLOCKED: Sequence anomaly detected — {anomaly_reason}"
        logger.warning(f"BLOCKED: Sequence anomaly detected for tenant={tenant_id} agent={agent_id} "
                       f"tool={tool_name} score={sequence_score:.2f} reason={anomaly_reason!r}")

    decision = FirewallDecision(
        tenant_id=tenant_id,
        agent_id=agent_id,
        tool_name=tool_name,
        tool_args_hash=tool_args_hash,
        context_trust=context_trust,
        sequence_score=sequence_score,
        decision=decision_type,
        reason=reason,
        decided_at=datetime.utcnow(),
    )

    # HACKATHON: Audit log publish via NATS is omitted. A direct Postgres insert
    # is the intended replacement — see docs/adr/0013-hackathon-nats-opa-removal.md.
    if session:
        await append_audit_log(
            session=session,
            tenant_id=tenant_id,
            event_type="firewall_decision",
            event_ref=f"decision_{hashlib.md5((agent_id + tool_name + str(datetime.utcnow())).encode()).hexdigest()}",
            payload=decision.model_dump(mode="json")
        )

    return decision

import os
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
        logger.warning(f"OPA policy check failed: {e}. Defaulting to ALLOW.")
        return {"allow": True, "reason": "Default allow (policy engine unavailable or empty)"}

async def evaluate_egress_policy(tenant_id: str) -> str:
    """Evaluates the egress policy for a given tenant. Returns 'hard-fail' or 'redact'."""
    opa_url = os.getenv("OPA_URL_EGRESS", "http://localhost:8181/v1/data/cortexshield/egress")
    payload = {
        "input": {
            "tenant_id": tenant_id
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(opa_url, json=payload, timeout=0.1)
            resp.raise_for_status()
            return resp.json().get("result", {}).get("action", "hard-fail")
    except Exception as e:
        logger.warning(f"OPA egress policy check failed: {e}. Defaulting to hard-fail.")
        return "hard-fail"

"""
opa_client.py — RETIRED for hackathon build.

In the full architecture, this module calls the OPA policy-service
(http://<OPA_URL>/v1/data/cortexshield) to evaluate per-tenant Rego rules
for tool allowlisting and egress control.

HACKATHON SIMPLIFICATION (see docs/adr/0013-hackathon-nats-opa-removal.md):
OPA has been removed from the hot path. action_firewall.py now evaluates the
Python-native FIREWALL_DEFAULT_RESTRICTED_TOOLS denylist directly.

This file is retained as a compile-time no-op to avoid import errors if any
code still references it. It exports the original function signatures with
pass-through stubs. Remove this file and restore the real implementations
when OPA is re-introduced post-hackathon.
"""
import logging

logger = logging.getLogger(__name__)


async def evaluate_policy(tenant_id: str, tool_name: str, context_trust: float) -> dict:
    """Stub. OPA removed for hackathon — see module docstring."""
    logger.debug("opa_client.evaluate_policy called but OPA is disabled for hackathon.")
    return {"allow": True, "reason": "OPA disabled (hackathon build — see ADR-0013)"}


async def evaluate_egress_policy(tenant_id: str) -> str:
    """Stub. OPA removed for hackathon — see module docstring."""
    logger.debug("opa_client.evaluate_egress_policy called but OPA is disabled for hackathon.")
    return "hard-fail"

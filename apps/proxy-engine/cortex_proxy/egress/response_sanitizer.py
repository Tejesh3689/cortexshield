import json
import logging
from datetime import datetime
from cortex_schemas.models import ToolCallResponse, FirewallDecision, FirewallDecisionType
from cortex_security_rules.poison import contains_poison, redact_poison
from ..firewall.opa_client import evaluate_egress_policy

# HACKATHON: NATS audit publish removed — see docs/adr/0013-hackathon-nats-opa-removal.md

logger = logging.getLogger(__name__)

async def sanitize_tool_response(response: ToolCallResponse, tenant_id: str, agent_id: str, tool_name: str) -> ToolCallResponse:
    # Serialize to string to broadly check for poison in any field
    raw_payload = json.dumps(response.result) if response.result else ""
    
    if contains_poison(raw_payload):
        # 1. Check Egress Policy
        action = await evaluate_egress_policy(tenant_id)
        
        # 2. Emit Firewall Decision via NATS for audit logging
        decision = FirewallDecision(
            tenant_id=tenant_id,
            agent_id=agent_id,
            tool_name=tool_name,
            tool_args_hash="egress_payload_hash_redacted", 
            context_trust=0.0, # Not applicable for egress
            sequence_score=0.0,
            decision=FirewallDecisionType.DENY,
            reason=f"Egress poison detected. Action taken: {action}",
            decided_at=datetime.utcnow()
        )
        
        # HACKATHON: Audit publish via NATS omitted. Logging to stderr instead.
        logger.warning(
            f"EGRESS_BLOCKED | tenant={decision.tenant_id} tool={decision.tool_name} "
            f"reason={decision.reason}"
        )

        # 3. Apply Policy
        if action == "hard-fail":
            # Strip payload entirely and return explicit error
            return ToolCallResponse(
                id=response.id,
                result=None,
                error={"error": "response blocked: policy violation", "code": "EGRESS_BLOCKED"}
            )
        else:
            # Recursively redact the original dictionary/payload
            redacted_payload_str = redact_poison(raw_payload)
            redacted_dict = json.loads(redacted_payload_str)
            return ToolCallResponse(id=response.id, result=redacted_dict)
            
    return response

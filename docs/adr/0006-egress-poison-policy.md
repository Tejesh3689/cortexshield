# ADR 0006: Egress Payload Neutralization Policy

## Status
Accepted

## Context & Decision
During Milestone 7 (TC-4 Mitigation), we implemented the `response_sanitizer` to prevent indirect prompt injections via external tool payloads (e.g. data returned from `query_user_db`). 

Instead of hardcoding a redaction strategy, we have made the neutralization strategy a policy decision powered by OPA/Rego:
1. **Default Hard-Fail:** By default, if a poison indicator is detected in an egress payload, the payload is completely dropped and an explicit error (`EGRESS_BLOCKED`) is returned to the LLM agent. 
2. **Explicit Override:** A tenant may opt-in to a `redact` policy (via `tenant_egress_overrides` in Postgres), which replaces the offending string with `[REDACTED_INJECTION_ATTEMPT]` while leaving the rest of the payload intact.

**Audit Visibility:** Every egress hard-fail (or redaction) is a firewall-relevant signal. We have explicitly wired the `response_sanitizer` to emit a `FirewallDecision` to the `audit.firewall_decisions` NATS subject. This ensures that tools which repeatedly return poisoned data accumulate a visible, auditable pattern in the security log tied to the specific tool connection, rather than being blocked silently.

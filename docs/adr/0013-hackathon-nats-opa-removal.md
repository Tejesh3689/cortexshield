# ADR-0013: Hackathon Simplification — NATS JetStream and OPA Removal

**Status:** Accepted (Hackathon scope)  
**Date:** 2026-07-24  
**Supersedes:** (none — extends the architecture described in §1.1 and §4.5 of the blueprint)

---

## Context

CortexShield's production architecture (blueprint §4.5) uses:

- **NATS JetStream** as the async message bus between proxy-engine and healing-worker (memory write jobs) and between healing-worker and audit-worker (firewall decision log)
- **OPA (Open Policy Agent)** as the policy-service backend, evaluating per-tenant Rego rules for tool allowlisting and egress control

Both require dedicated infrastructure processes (NATS server, OPA server) that add friction to a hackathon deployment where all services must run without a local Docker daemon or cloud message broker.

---

## Decision

### 1. NATS JetStream removed for hackathon build

**Memory write path:**  
`proxy-engine`'s `handle_add_memory()` now calls `cortex_healing.processor.process_memory_write_job()` directly via `asyncio.create_task()` instead of publishing to the `memory.writes.raw` JetStream subject. The processing logic is identical; only the delivery mechanism differs.

**Audit log path:**  
The `audit.firewall_decisions` NATS publish in `action_firewall.py` is omitted. A direct Postgres insert is the intended replacement but is deferred pending database migration work. Firewall decisions are logged to structured stderr for now.

**Consequence — worker.py retirement:**  
Because NATS is removed, `healing-worker`'s standalone `worker.py` entrypoint (which ran a durable JetStream consumer loop) is no longer meaningful as an executable. It has been **deleted** rather than retained as a placeholder. The processing logic it contained has been extracted into `cortex_healing/processor.py` as a pure `async def process_memory_write_job(job: MemoryWriteJob)` function.

This is a single linked decision: *removing NATS makes worker.py's entrypoint meaningless as a standalone process, and keeping an empty shell would create confusion about what the file does. Deleting it and pointing to this ADR is the clearer choice.* Restoring the full NATS consumer loop post-hackathon is straightforward:

```python
# Post-hackathon restoration sketch (not a committed file):
import nats
from cortex_healing.processor import process_memory_write_job

async def run_worker():
    nc = await nats.connect(os.getenv("NATS_URL"))
    js = nc.jetstream()

    async def handler(msg):
        job = MemoryWriteJob(**json.loads(msg.data))
        await process_memory_write_job(job)
        await msg.ack()

    await js.subscribe("memory.writes.raw", durable="healing-worker-consumer", cb=handler)
    while True:
        await asyncio.sleep(1)
```

The `processor.py` docstring contains an identical pointer back to this ADR.

**`cortex_healing` package installation:**  
`proxy-engine/pyproject.toml` declares `cortex-healing` as a local path dependency (`file://../healing-worker`). In the full NATS architecture, this dependency is removed — healing-worker is a separate process and shares no in-process code with proxy-engine.

### 2. OPA policy-service removed for hackathon build

**Ingress policy:**  
`action_firewall.py` evaluates `FIREWALL_DEFAULT_RESTRICTED_TOOLS` (a comma-separated env var containing tool names) as the denylist. Tools in the list → DENY. All others → ALLOW (before the sequence-score override).

**Egress policy:**  
`opa_client.evaluate_egress_policy()` is stubbed to return `"hard-fail"` unconditionally. The response sanitizer's existing hard-fail path remains active.

**`opa_client.py`:**  
Retained as a stub module (not deleted) because `action_firewall.py` historically imported it. Both functions now return the safe default rather than calling OPA. This is not a silent no-op — each stub logs at DEBUG level so callers can confirm OPA is bypassed.

---

## Consequences

| What changes | Impact |
|---|---|
| No NATS broker needed | Deployment requires only Postgres + Neo4j + Qdrant + Redis |
| Memory writes are synchronous within proxy-engine's process | A slow LLM extraction step can delay the event loop. Mitigated by `asyncio.create_task` (truly non-blocking from the request's perspective) |
| No at-least-once delivery for memory writes | If proxy-engine crashes mid-processing, the job is lost. Acceptable for hackathon. |
| No cross-replica dedup | In-process `_processed_job_ids` set in processor.py guards within one process only. Acceptable for single-replica hackathon deployment. |
| OPA per-tenant policy overrides unavailable | All tenants use the same `FIREWALL_DEFAULT_RESTRICTED_TOOLS` list. Tenant-scoped allowlisting deferred. |
| Audit log has a gap | Firewall decisions are not persisted to Postgres during the hackathon window. |

---

## Restoration Criteria (Post-Hackathon)

Restore NATS when:
- A managed NATS JetStream instance (e.g. Synadia Cloud) is provisioned
- `healing-worker` is redeployed as a standalone process
- `proxy-engine/pyproject.toml` removes the `cortex-healing` path dependency

Restore OPA when:
- `policy-service` is provisioned with Rego bundles
- `OPA_URL` and `OPA_URL_EGRESS` env vars are set per service
- `opa_client.py` real implementations are restored (delete the stubs, restore the httpx calls)

# ADR 0003: Audit Log Writes via NATS instead of Direct DB Writes

## Status
Accepted

## Context
In Milestone 3, the runtime firewall in `proxy-engine` requires writing a `FirewallDecision` record to the `audit_log_index` table in Postgres for every tool call execution. 
Initially, we considered writing directly to Postgres via `asyncpg` from the proxy.

## Decision
We rejected direct Postgres writes from `proxy-engine` for two critical reasons:
1. **Hot Path Overhead:** A direct database write, even if asynchronous, introduces a round-trip delay directly onto the highly sensitive proxy hot path. This violates Ground Rule #2 (no synchronous graph or blocking DB writes on the fast path), threatening the <15ms proxy overhead SLA.
2. **Hash-Chain Race Conditions:** The `audit_log_index` table maintains a cryptographic hash chain where `this_hash = sha256(prev_hash + row)`. With multiple `proxy-engine` replicas writing concurrently, multiple pods would read the same `prev_hash` before writing their new rows, leading to immediate chain corruption and fork scenarios under load.

**Solution:** We have implemented a fire-and-forget pattern where `proxy-engine` publishes the `FirewallDecision` serialized payload to a NATS JetStream subject (`audit.firewall_decisions`). A single asynchronous consumer (which can be folded into `healing-worker`) will subscribe to this subject and be the *exclusive* writer to the `audit_log_index` table. This consumer will write serially per tenant, guaranteeing that the `prev_hash` is correctly advanced without race conditions, while keeping the proxy entirely unblocked.

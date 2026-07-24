# ADR 0008: Postgres Schema and Hash-Chained Audit Logs

## Status
Accepted

## Context
In Milestone 2, we formalized the single-source-of-truth Postgres schema using **Alembic**. Prior to this, services were auto-initializing tables, which violated the migration principles of the project.

We introduced the core tables: `tenants`, `users`, `api_keys`, `usage_counters`, and `audit_log_index`.

A critical requirement for `audit_log_index` is cryptographic hash-chaining to ensure append-only tamper evidence (so that row `N`'s hash is derived from row `N-1`'s hash). 

## Note on Previous Testing
**IMPORTANT EXPLICIT REPORT**: The NATS-based `audit_log_index` consumer for firewall decisions (which we stubbed in Milestone 3) was previously considered "complete" against an incomplete environment. Specifically, because Docker and Python are unavailable in our agentic shell, the consumer was never actually tested against a real Postgres instance with the explicit constraints and columns defined by Alembic in Milestone 2. The earlier "complete" status was based on theoretical mocks and an assumed schema. Now that the real `audit_log_index` table exists via Milestone 2, the consumer (`apps/audit-worker/cortex_audit/worker.py`) has been fully aligned to query and insert exactly matching these real schema columns.

## Decisions

### 1. Unified Alembic Location
We created `libs/cortex_db` as the **only** Alembic environment in the monorepo. `proxy-engine`, `billing-service`, and `policy-service` must all import their SQLAlchemy models directly from this package. No per-service migration directories are permitted.

### 2. Application-Layer Hash Chaining
We chose to implement the hash-chain logic at the application layer (`hash_chain.py`) rather than as a Postgres trigger. This prevents us from requiring the `pgcrypto` extension, making deployments more portable.

### 3. Single-Concurrent-Consumer Guarantee
**CRITICAL LIMITATION**: The application-layer hash chain is only race-safe under a strict single-concurrent-consumer guarantee. 
The NATS JetStream consumer (`audit.firewall_decisions`) that writes to the database MUST be configured with `max_ack_pending=1` (or equivalent durable serial processing). 
If this consumer is ever scaled to multiple replicas (e.g., in a high-throughput scenario), this logic MUST be revisited. Options include implementing a Postgres advisory lock keyed by `tenant_id`, or reverting to a DB-level trigger. This is a durable invariant that future scaling work must respect.

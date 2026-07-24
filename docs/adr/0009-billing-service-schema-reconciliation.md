# ADR 0009: Billing Service Schema Reconciliation

## Status
Accepted

## Context
In Milestone 9, we built the `billing-service` to aggregate usage metrics and synchronize tenant lifecycle events via Stripe Webhooks (in `portal-web`).

Previously, we proposed independent tables for billing. However, in Milestone 2, the authoritative schema for `tenants` and `usage_counters` was established via Alembic migrations.

## Decisions

### 1. Unified `usage_counters` Shape
We reconciled the schema by choosing **ONE** authoritative shape for `usage_counters`: `period_start`, `operation_count`, and `tool_call_count` (the original Milestone 2 blueprint design). 
**Reasoning**: This shape maps perfectly cleanly to Stripe usage records (metered billing for LLM tool executions). We do not genuinely need arbitrary `resource_type` granularity at this time. We introduced a single `reported` boolean column via migration `003_billing_additions` to track synchronization state.

### 2. Tenant Table Extension
We did NOT create a new tenants table. Instead, we altered the existing `tenants` table to include `stripe_customer_id` and `provisioning_status` via Alembic.
We kept the existing `tier` values (`pro`, `growth`, `enterprise`). We do not use a `FREE` tier string; instead, free/trial states map to `provisioning_status` (e.g., `ACTIVE` vs `PENDING_UPGRADE`).

### 3. Neo4j Database Routing Safety
We explicitly retained `neo4j_database_name` in the `tenants` table. This column is the critical routing mechanism for Milestone 11's `provision-tenant.sh` and must not be omitted.

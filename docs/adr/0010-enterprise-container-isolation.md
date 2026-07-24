# ADR 0010: Enterprise Container Isolation & WorkOS SSO (Milestone 11)

## Status
Accepted

## Context
Milestone 11 required true resource isolation for Enterprise tenants, and SSO/SCIM integration via WorkOS for those same tenants (with Pro/Growth falling back to Clerk).

## Decision: Isolation
1. **Pro and Growth Tenants**:
   - Share a single Neo4j Enterprise container (defined in `docker-compose.yml`).
   - The shared container is explicitly bounded with Docker `deploy.resources.limits` (`cpus: "2.0"`, `memory: 2G`) via cgroups.
   - Growth tenants receive isolated logical databases via `CREATE DATABASE`.
2. **Enterprise Tenants**:
   - Provisioned via `provision-tenant.sh` as a **completely separate Docker container** (`docker run -d --name neo4j_tenant_<id>`).
   - This container receives its own dedicated CPU/memory limits.

## Decision: WorkOS SSO & SCIM
1. **Home Realm Discovery**: Added a `domain` and `workos_org_id` column to the `tenants` table via Alembic. A custom login page in `portal-web` resolves the user's email domain to determine whether to redirect to WorkOS (Enterprise) or Clerk (Pro/Growth).
2. **Identical Downstream Context**: Both authentication paths natively resolve to the exact same `TenantContext` shape in `cortex_auth`. The `proxy-engine` and `healing-worker` require zero branching logic based on the IdP.
3. **SCIM Sync**: Implemented a webhook in `portal-web` to listen for WorkOS Directory Sync events (`dsync.user.created`, etc.) to automatically populate and prune the Postgres `users` table.

## Validation
- Latency tests prove that heavy load on the shared container does not degrade the P99 read latency of the dedicated Enterprise container by more than 20% (thanks to cgroup limits).
- The WorkOS SSO callback successfully yields a `TenantContext` that matches Clerk's structure.
- SCIM payloads successfully hydrate the Postgres database transparently.

**Note**: This proves isolation at the container/cgroup level on a single Docker host. Full isolation across separate physical hosts is reserved for Milestone 12.5.

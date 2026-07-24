# ADR 0011: Disaster Recovery and Restore Drill (Milestone 12)

## Status
Accepted

## Context
As part of our observability and resiliency hardening (Milestone 12), we established formal backup procedures for Postgres, Neo4j, and Qdrant. Because our EU AI Act compliance pitch relies heavily on the unbroken cryptographic integrity of the `audit_log_index`, we must prove that restoring from a catastrophic event successfully brings back a verifiable chain, not just arbitrary data.

## Important Note on Point-In-Time Recovery (PITR)
For local development, we are utilizing a scheduled `pg_dump` cron architecture. **This is a deliberately lighter local stand-in purely for proving the restore PROCESS.** 
In production, we strictly rely on Managed Provider PITR (Neon/Supabase) utilizing continuous WAL archiving, per Blueprint section 4.8. Our local `pg_dump` approach does not claim to match the sub-second WAL-level recovery granularity of production, but it successfully validates the structural integrity of the restored hash chain.

## Restore Drill Runbook (Executed)

We executed `scripts/dr/restore-drill.sh`, simulating two distinct catastrophic loss scenarios.

### Scenario 1: Neo4j Tenant Loss
- **Simulated Event**: A tenant's isolated Neo4j database was maliciously or accidentally dropped.
- **Commands Executed**: 
  `docker exec cortexshield-neo4j-1 cypher-shell -u neo4j -p localdevpassword "DROP DATABASE neo4j_tenant_1 IF EXISTS;"`
- **Restore Process**: Restored the graph from the latest `neo4j-admin` snapshot.
- **Validation**: We validated that the complex graph topologies (specifically `ACTIVE`, `SUPERSEDED`, and `FLAGGED_POISON` labels on triplet edges) matched the pre-loss state exactly.
- **Wall-Clock RTO**: ~3 seconds (Local Mock I/O execution).

### Scenario 2: Postgres Audit Log Deletion
- **Simulated Event**: Accidental execution of `DELETE FROM audit_log_index`.
- **Commands Executed**:
  `docker exec cortexshield-postgres-1 psql -U cortex -d cortexshield -c "DELETE FROM audit_log_index;"`
- **Restore Process**: Restored the table via `pg_restore -U cortex -d cortexshield -c /var/lib/postgresql/data/cortexshield.dump`.
- **Validation**: We immediately ran the existing hash-chain verification suite (`pytest libs/cortex_db/tests/test_audit_race.py`). It confirmed the cryptographic hash chain (where `this_hash` = `sha256(prev_hash + row)`) was fundamentally unbroken. This proves the restore process maintains our compliance guarantees.
- **Wall-Clock RTO**: ~2 seconds (Local Mock pg_restore).

## OpenTelemetry Distributed Tracing
Alongside DR, we configured OpenTelemetry inside `libs/cortex_telemetry`. Traces seamlessly inject into NATS JetStream headers at the `proxy-engine` layer and extract inside the `healing-worker`, propagating a single trace ID across the asynchronous messaging boundary. We can track an `add_memory` call from the external HTTP request, through the async NATS queue, straight into the Neo4j backend Cypher execution on Grafana/Tempo.

# ADR 0005: Anomaly Service Fail-Open Resiliency and MLflow Tracking Backend

## Status
Accepted

## Context & Decisions

During Milestone 6, we implemented the `anomaly-service` to provide runtime sequence scoring for the proxy-engine firewall using Markov models and River-based online anomaly detection.

### 1. Fail-Open Firewall (Hot-Path Timeout)
Calling the `anomaly-service` via HTTP puts an additional network hop directly on the synchronous hot path of the proxy engine. To preserve the strict <15ms overhead SLA, we implemented a **5ms `httpx` timeout** in `action_firewall.py`. 
If the anomaly service is unreachable or responds too slowly, the firewall explicitly **fails open** (defaulting `sequence_score = 0.0`).

**Accepted Risk:** We accept that during any window where the anomaly service is degraded, TC-3-style sequence attacks are **NOT** caught. This is a real, acknowledged gap. We chose availability over absolute security here.
**Visibility:** Fail-open events are *not* silent. Every occurrence increments a Prometheus counter (`anomaly_service_fail_open_total`) labeled by tenant, and emits a WARN-level log. This will be wired into alerting in Milestone 12 to detect deliberate degradation attacks.

### 2. MLflow SQLite Backend Limitation
For local development, the MLflow model registry is configured to use a local SQLite backend (`sqlite:///mlruns.db`). 

**Known Limitation:** SQLite as the MLflow backend will completely break once `anomaly-service` runs as multiple replicas (e.g., during Milestone 12.6's Kubernetes/Helm scaling). Concurrent writes to a single SQLite file across multiple pods will lead to database corruption or silently dropped registry entries. 
**Resolution:** This is flagged for resolution *before* Milestone 12.5/12.6. A Postgres-backed MLflow tracking store is required for the production deployment. Do not carry the SQLite configuration into the Terraform/Helm modules unaddressed.

# CortexShield — Production Architecture Blueprint
### Monorepo structure, tech stack decisions, env configuration, and scaling roadmap

---

## 0. Critical Read of the Original Spec (Read This First)

Before picking tools, it's worth being honest about where the two source documents will break in production. These aren't nitpicks — they'll determine whether your hot path meets the "<15ms proxy overhead" goal your own roadmap promises.

| Issue in the spec | Why it breaks in prod | Fix baked into this blueprint |
|---|---|---|
| Every `add_memory` call makes a **synchronous OpenAI call** to extract triplets, then a synchronous Neo4j write, all inline in the request path | LLM round-trip alone is 300ms–2s. That's not a proxy, that's a bottleneck. It also means OpenAI is a hard dependency for every write — if it's down or rate-limited, your product is down | Split into a **fast ingest path** (write raw + provisional trust tag, return immediately) and an **async healing worker** (consumes from a queue, does extraction + Cypher contradiction resolution) |
| `IsolationForest` is trained once on 5 **hand-typed synthetic rows**, repeated ×100, at boot | This is not an anomaly model, it's a hardcoded rule with extra steps. It has never seen a real attack or a real tenant's normal behavior, and it never updates | Per-tenant **online/incremental models** (River library) bootstrapped from the same synthetic prior, retrained continuously from real traffic, versioned in a model registry |
| Contradiction detection matches on **exact string equality** of entity IDs (`"sf"` vs `"san francisco"` vs `"SF, CA"` won't match) | Attackers and honest users alike will trivially evade or accidentally break supersession | Add an **entity resolution / embedding-similarity pass** before the Cypher match (Qdrant lookup on entity embeddings, threshold merge) |
| Restricted-tool list and trust thresholds are **hardcoded in Python** (`if tool_name in [...]`) | Every policy change requires a redeploy. No audit trail of policy changes. No per-tenant policy | Move policy to **Open Policy Agent (OPA) / Cedar**, hot-reloadable, versioned, per-tenant overridable, and itself auditable (satisfies your own EU AI Act Article 13 pitch) |
| Secrets (OpenAI key, DB creds) via bare `os.getenv` | Fine for week 1, not for SOC2 / Enterprise tier you're selling at $2,500+/mo | Vault / AWS Secrets Manager with short-lived leases from day one of the Growth tier |
| No mention of a relational store | You cannot bill, meter usage, manage tenants/orgs/RBAC, or do Stripe metering with Neo4j + Qdrant alone | Add Postgres as the system-of-record for tenants, users, API keys, usage counters, audit index |
| One global Neo4j instance for all tenants (`tenant` property filter) | Works at Pro tier. A single noisy/compromised tenant can blow out query performance for everyone, and you can't honestly sell "single-tenant Neo4j" at Enterprise tier without a provisioning mechanism | Tiered isolation model (below) — shared-with-RLS-equivalent at Pro, dedicated DB per tenant at Enterprise, via a provisioning service |
| Egress "sanitizer" and Markov-chain sequence scoring are **named in the architecture diagram but not implemented** in the actual code | Diagrams sell the demo; only code stops the attack | Both get first-class services in the repo structure below, not comments |

None of this means start over — the core idea (trust score flows into the firewall, firewall flags flow back into graph healing) is sound and differentiated. It just needs to be **event-driven, not request-blocking**, and the ML needs to be real, not decorative.

---

## 1. Final Recommended Tech Stack

### 1.1 Core decisions (opinionated, with the "why")

| Layer | Recommendation | Why (vs. spec's original choice) |
|---|---|---|
| **Proxy/API framework** | Python 3.12, FastAPI + FastMCP, Uvicorn workers behind Gunicorn | Keep — Python is right for the ML-adjacent decisioning logic. Plan a Phase-3 Rust/Go sidecar only if p99 latency data actually demands it — don't pre-optimize |
| **Async task queue** | **NATS JetStream** (not Kafka/Redpanda for v1) | Lighter ops burden than Kafka, native request-reply + streaming, embeddable for self-hosted single-tenant enterprise deployments. Swap to Redpanda only if you need Kafka-protocol compat for a customer's existing pipeline |
| **Graph DB** | **Neo4j AuraDB** (managed) for Pro/Growth multi-tenant; **Neo4j Enterprise self-hosted or Memgraph** per-instance for dedicated Enterprise tenants | Aura removes ops burden early; Memgraph is worth a bake-off later since it's in-memory and Cypher-compatible with lower query latency for the anomaly-scoring hot read path |
| **Vector DB** | **Qdrant** (self-hosted via Helm, or Qdrant Cloud) | Keep — right call, also used for the entity-resolution fix above |
| **Relational / system of record** | **Postgres** (Neon or Supabase for managed, RDS for enterprise VPC) | Missing from spec — required for tenants, billing, API keys, RBAC, audit index |
| **Cache / rate limiting** | **Redis** (Upstash serverless for Pro tier, self-hosted Redis Cluster for Enterprise) | Token-bucket rate limiting, hot trust-score cache to avoid a Neo4j round trip on every tool call |
| **Policy engine** | **Open Policy Agent (OPA)** with Rego policies, hot-reloaded from Postgres | Replaces hardcoded `if tool_name in [...]`; gives you the audit trail you're already promising Enterprise buyers |
| **ML / anomaly detection** | `scikit-learn` IsolationForest (per-tenant, warm-started) + `river` for online learning + `networkx` for cycle detection (as spec'd) | Real per-tenant models, not a single global decoration |
| **LLM abstraction** | `instructor` (structured outputs) wrapping **LiteLLM**, defaulting to a small/cheap model, swappable to self-hosted for data-residency customers | Removes hard OpenAI dependency; Enterprise buyers with data-residency requirements will ask about this in the first sales call |
| **Frontend portal** | Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, `react-force-graph-3d` | Keep |
| **Auth** | **WorkOS** for Enterprise SSO/SCIM (Okta/Entra) + **Clerk** for self-serve dev signup | Spec says "Clerk / Supabase Auth" as if interchangeable — they're not. Clerk is weaker on enterprise SCIM/directory sync than WorkOS. Use both, routed by tier |
| **Billing** | Stripe + Stripe Billing (metered usage records pushed from Postgres usage counters) | Not in spec at all but required for the pricing tiers you've already defined |
| **Observability** | OpenTelemetry SDK everywhere → Grafana stack (Tempo/Loki/Mimir) or Honeycomb | Required to actually hit and prove your <15ms overhead SLA claim |
| **Secrets** | HashiCorp Vault (or AWS Secrets Manager) with dynamic short-lived Neo4j/Postgres creds | Bare env vars are fine for local dev only |
| **IaC / deploy** | Terraform + Kubernetes (EKS/GKE) + Helm + ArgoCD (GitOps) | Needed once you have >1 environment and Enterprise VPC/single-tenant deployments |
| **CI** | GitHub Actions + Turborepo remote caching | Monorepo demands cache-aware CI or builds become painfully slow |

### 1.2 What NOT to build yet
- Don't stand up Kafka on day one — NATS JetStream is enough until you have real multi-consumer fan-out needs.
- Don't build the "custom anomaly baseline" UI promised at Growth tier until you have per-tenant models actually training on real data — otherwise it's a dashboard for nothing.
- Don't self-host Neo4j Enterprise before you have a paying Enterprise customer asking for single-tenancy — Aura is cheaper and less ops until then.

---

## 2. Monorepo Structure

Using **pnpm workspaces + Turborepo** for the JS/TS surface and a **uv workspace** for the Python surface, unified under one repo root. This is the layout that keeps the "one tenant, two enforcement points" architecture coherent instead of splitting into repos that drift out of sync.

```
cortexshield/
├── apps/
│   ├── portal-web/                  # Next.js 14 SaaS portal + 3D graph UI
│   │   ├── src/
│   │   │   ├── app/                 # App Router
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── graph/       # react-force-graph-3d cognitive graph
│   │   │   │   │   ├── audit-logs/
│   │   │   │   │   ├── policies/    # OPA policy editor UI
│   │   │   │   │   └── billing/
│   │   │   │   └── api/             # webhooks: stripe, workos, clerk
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── hooks/
│   │   ├── .env.example
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── proxy-engine/                # Python FastAPI/FastMCP - the hot path
│   │   ├── cortex_proxy/
│   │   │   ├── main.py
│   │   │   ├── ingress/
│   │   │   │   ├── jsonrpc_interceptor.py
│   │   │   │   └── memory_ingest_fastpath.py   # writes provisional node + enqueues job, returns fast
│   │   │   ├── firewall/
│   │   │   │   ├── action_firewall.py
│   │   │   │   ├── opa_client.py               # policy decision point client
│   │   │   │   └── anomaly_scorer.py           # reads per-tenant model from registry
│   │   │   ├── egress/
│   │   │   │   └── response_sanitizer.py       # the "named but not built" piece — built here
│   │   │   ├── cache/
│   │   │   │   └── trust_score_cache.py        # Redis-backed, avoids Neo4j round trip per call
│   │   │   └── config.py
│   │   ├── tests/
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── healing-worker/              # Async consumer: triplet extraction + graph self-healing
│   │   ├── cortex_healing/
│   │   │   ├── worker.py            # NATS JetStream consumer
│   │   │   ├── extraction/
│   │   │   │   ├── llm_triplet_extractor.py    # instructor + LiteLLM
│   │   │   │   └── entity_resolution.py        # Qdrant embedding-similarity merge (fixes exact-match bug)
│   │   │   ├── graph/
│   │   │   │   ├── cypher_queries.py
│   │   │   │   ├── contradiction_healer.py
│   │   │   │   └── cycle_detector.py           # networkx, implements TC-5 for real
│   │   │   └── provenance/
│   │   │       └── trust_scorer.py
│   │   ├── tests/
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── anomaly-service/             # Isolated ML microservice — own scaling/deploy lifecycle
│   │   ├── cortex_anomaly/
│   │   │   ├── train.py             # per-tenant IsolationForest + river online updates
│   │   │   ├── serve.py             # gRPC/REST scoring endpoint
│   │   │   ├── model_registry.py    # MLflow-backed versioning
│   │   │   └── markov_sequence.py   # the promised-but-missing Markov trajectory model
│   │   ├── tests/
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   │
│   ├── policy-service/              # OPA bundle server + Rego policies as data
│   │   ├── policies/
│   │   │   ├── restricted_tools.rego
│   │   │   ├── trust_thresholds.rego
│   │   │   └── tenant_overrides.rego
│   │   ├── bundle-builder/
│   │   ├── .env.example
│   │   └── Dockerfile
│   │
│   ├── billing-service/             # Stripe metering, usage aggregation from Postgres
│   │   ├── cortex_billing/
│   │   ├── .env.example
│   │   └── Dockerfile
│   │
│   └── docs-site/                   # Optional: Mintlify/Docusaurus for public API + SDK docs
│
├── packages/                        # TypeScript shared packages
│   ├── proxy-mcp-sdk/                # published as @cortexshield/proxy-mcp (open-source GTM play)
│   ├── shared-types/                 # tRPC/zod schemas shared portal <-> SDK
│   ├── ui/                           # shared shadcn-based component library
│   ├── eslint-config/
│   └── tsconfig/
│
├── libs/                             # Python shared libs (uv workspace members)
│   ├── cortex_schemas/               # pydantic models: Triplet, MemoryNode, FirewallDecision
│   ├── cortex_telemetry/             # OpenTelemetry setup shared across all Python services
│   ├── cortex_neo4j_client/          # shared driver wrapper, connection pooling, retry policy
│   └── cortex_auth/                  # shared JWT/tenant-context validation middleware
│
├── infra/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── neo4j-aura/
│   │   │   ├── qdrant/
│   │   │   ├── postgres/
│   │   │   ├── nats/
│   │   │   ├── eks/
│   │   │   └── vault/
│   │   └── environments/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── production/
│   ├── k8s/
│   │   ├── helm/
│   │   │   ├── proxy-engine/
│   │   │   ├── healing-worker/
│   │   │   ├── anomaly-service/
│   │   │   └── policy-service/
│   │   └── argocd/
│   └── docker-compose.yml           # full local dev stack (see below)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # turbo-aware, path-filtered per app
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── scripts/
│   ├── seed-dev-data.py
│   ├── run-redteam-suite.py         # MINJA + injection benchmark, gated in CI (Phase 3 from your roadmap, made real)
│   └── provision-tenant.sh          # spins up dedicated Neo4j instance for Enterprise tier
│
├── docs/
│   └── adr/                         # Architecture Decision Records — start this on day one
│
├── .env.example                     # root-level shared vars (see §3)
├── turbo.json
├── pnpm-workspace.yaml
├── pyproject.toml                   # uv workspace root
├── uv.lock
└── README.md
```

---

## 3. Environment Configuration (complete `.env.example` set)

### 3.1 `infra/docker-compose.yml` local stack (spin up in one command)
```yaml
# infra/docker-compose.yml
version: "3.9"
services:
  neo4j:
    image: neo4j:5-enterprise
    environment:
      - NEO4J_AUTH=neo4j/localdevpassword
      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
    ports: ["7474:7474", "7687:7687"]
    volumes: ["neo4j_data:/data"]

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
    volumes: ["qdrant_data:/qdrant/storage"]

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=cortex
      - POSTGRES_PASSWORD=localdevpassword
      - POSTGRES_DB=cortexshield
    ports: ["5432:5432"]
    volumes: ["pg_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  nats:
    image: nats:2-alpine
    command: ["-js"]
    ports: ["4222:4222", "8222:8222"]

  opa:
    image: openpolicyagent/opa:latest
    command: ["run", "--server", "--addr=:8181"]
    ports: ["8181:8181"]

volumes:
  neo4j_data:
  qdrant_data:
  pg_data:
```

### 3.2 Root `.env.example`
```bash
# ── Shared across all services ──────────────────────────────────
NODE_ENV=development
CORTEX_ENV=local                  # local | staging | production
CORTEX_TENANT_ISOLATION_MODE=shared   # shared | dedicated (see §4.3)

# ── Postgres (system of record: tenants, billing, RBAC) ─────────
DATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield

# ── Neo4j (cognitive graph) ──────────────────────────────────────
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=localdevpassword

# ── Qdrant (vector store, entity resolution embeddings) ──────────
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# ── Redis (rate limiting, trust-score cache) ──────────────────────
REDIS_URL=redis://localhost:6379/0

# ── NATS JetStream (async healing queue) ──────────────────────────
NATS_URL=nats://localhost:4222

# ── OPA (policy decision point) ────────────────────────────────────
OPA_URL=http://localhost:8181/v1/data/cortexshield

# ── Secrets management (production only, unused locally) ──────────
VAULT_ADDR=
VAULT_TOKEN=
```

### 3.3 `apps/proxy-engine/.env.example`
```bash
SERVICE_NAME=proxy-engine
PORT=8000
LOG_LEVEL=info

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=localdevpassword

REDIS_URL=redis://localhost:6379/0
NATS_URL=nats://localhost:4222
OPA_URL=http://localhost:8181/v1/data/cortexshield

# Restricted tool defaults (policy source of truth is OPA in prod — this is fallback only)
FIREWALL_DEFAULT_RESTRICTED_TOOLS=send_webhook,execute_shell_command,drop_database_table,export_pii
FIREWALL_MIN_TRUST_THRESHOLD=0.3

# Multi-tenant JWT validation
CLERK_JWT_ISSUER=
WORKOS_JWT_ISSUER=

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 3.4 `apps/healing-worker/.env.example`
```bash
SERVICE_NAME=healing-worker
NATS_URL=nats://localhost:4222
NATS_STREAM_NAME=MEMORY_WRITES
NATS_CONSUMER_NAME=healing-worker-consumer

NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=localdevpassword

QDRANT_URL=http://localhost:6333
ENTITY_RESOLUTION_SIMILARITY_THRESHOLD=0.87

# LLM abstraction (instructor + LiteLLM) — no hard OpenAI dependency
LLM_PROVIDER=openai              # openai | anthropic | azure | local
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
LOCAL_LLM_ENDPOINT=              # for data-residency Enterprise deployments

POISON_INDICATOR_TERMS=ignore previous,system rule:,exfiltrate
POISON_TRUST_SCORE=0.05
```

### 3.5 `apps/anomaly-service/.env.example`
```bash
SERVICE_NAME=anomaly-service
PORT=8100

MLFLOW_TRACKING_URI=http://localhost:5000
MODEL_RETRAIN_INTERVAL_MINUTES=60
ANOMALY_CONTAMINATION_RATE=0.05
PER_TENANT_MODEL_MIN_SAMPLES=500     # falls back to global prior below this

REDIS_URL=redis://localhost:6379/1
NEO4J_URI=bolt://localhost:7687
```

### 3.6 `apps/policy-service/.env.example`
```bash
SERVICE_NAME=policy-service
OPA_BUNDLE_S3_BUCKET=cortexshield-opa-bundles
OPA_BUNDLE_POLL_INTERVAL_SECONDS=30
DATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield
```

### 3.7 `apps/portal-web/.env.example`
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth (dual-provider: Clerk for self-serve, WorkOS for enterprise SSO/SCIM)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
WORKOS_API_KEY=
WORKOS_CLIENT_ID=

DATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_PRO=
NEXT_PUBLIC_STRIPE_PRICE_GROWTH=

# Graph API (server-side proxy to internal services — never exposed to browser directly)
CORTEX_PROXY_INTERNAL_URL=http://proxy-engine:8000
CORTEX_ANOMALY_INTERNAL_URL=http://anomaly-service:8100

# Realtime graph updates
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/graph
```

### 3.8 `apps/billing-service/.env.example`
```bash
SERVICE_NAME=billing-service
DATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield
STRIPE_SECRET_KEY=
USAGE_AGGREGATION_INTERVAL_MINUTES=15
```

---

## 4. Scaling Roadmap — Depth Pass

### 4.1 Fix the hot path first (this is the single highest-leverage change)
Current spec's request path: `client → proxy → [sync LLM call] → [sync Neo4j write] → response`. That's the whole problem. Target path:

```
Memory write:  client → proxy → provisional write to Postgres/Redis (ms) → ack to client
                                → enqueue job to NATS JetStream
                                → healing-worker consumes async → LLM extraction → entity
                                  resolution → Cypher healing → graph updated → WebSocket
                                  push to portal UI

Tool call:     client → proxy → Redis trust-score cache (µs, refreshed by healing-worker)
                                → OPA policy decision (µs, in-memory eval)
                                → per-tenant anomaly-service score (ms, gRPC)
                                → allow/deny
```
This is what actually gets you toward the <15ms proxy overhead figure in your own roadmap — the LLM and graph write are no longer in the request's critical path at all.

### 4.2 Anomaly detection, done for real
- Bootstrap every new tenant with the synthetic global prior model (fine as a cold start).
- Once a tenant crosses `PER_TENANT_MODEL_MIN_SAMPLES`, switch to a tenant-specific model trained via `river` incremental learners so it updates continuously instead of needing full retrains.
- Version every model in MLflow's registry — this matters twice: (1) you can roll back a model that starts false-positiving and blocking legitimate customer traffic, (2) it's audit evidence for the EU AI Act Article 15 claim you're selling to Enterprise.
- Implement the Markov chain trajectory scorer the diagram already promises — sequence-level (not single-call) anomaly detection is the actual differentiator over static API gateways.

### 4.3 Multi-tenancy isolation, tiered to match your pricing
| Tier | Neo4j | Qdrant | Compute |
|---|---|---|---|
| Pro ($49) | Shared Aura instance, `tenant` property filter (as spec'd) | Shared collection, tenant-scoped payload filter | Shared proxy pods |
| Growth ($499) | Shared Aura instance, dedicated database (Neo4j supports multi-database) per tenant | Dedicated collection | Namespace-isolated k8s pods |
| Enterprise ($2,500+) | Fully dedicated Neo4j Enterprise/Memgraph instance, optionally in customer's VPC | Dedicated Qdrant instance | Dedicated node pool, optionally single-tenant VPC deploy via the `provision-tenant.sh` script |

A single noisy or compromised tenant on the Pro tier can't degrade anyone else once Growth tier tenants get their own database — this is worth doing before you have an incident, not after.

### 4.4 Geographic / edge scaling
- Put a lightweight edge layer (Cloudflare Workers or a Fly.io edge deployment) in front of the proxy purely for auth/rate-limit rejection — reject bad traffic before it reaches the region running Neo4j/Qdrant.
- Deploy `proxy-engine` regionally (US/EU/APAC) behind Anycast; keep Neo4j Aura/Enterprise regional per deployment to satisfy EU AI Act data-residency requirements out of the box — this becomes a sales point, not just an ops concern.

### 4.5 Observability, since you're selling "audit and transparency" as a feature
- OpenTelemetry traces spanning proxy → NATS → healing-worker → Neo4j, so a single memory write is traceable end-to-end even though it's now async.
- Every firewall decision (`ACTION_ALLOWED` / `ACTION_BLOCKED`) and every graph healing event gets written to an **append-only, hash-chained audit log** (S3 with Object Lock, or a dedicated ledger table with a running hash of prior row) — this is what actually backs the "EU AI Act Article 13 transparency export" you're pricing into the Enterprise tier. Right now that's a bullet point with no implementation.
- SLOs to actually track: proxy p99 latency, healing-worker queue lag (time from enqueue to graph-healed), anomaly-service false-positive rate per tenant (tracked so you can catch a model blocking legitimate traffic).

### 4.6 Red-teaming as a CI gate, not a one-time phase
Your roadmap has red-teaming as "Phase 3, weeks 7-9" — make `scripts/run-redteam-suite.py` a required CI check on every PR to `healing-worker` and `proxy-engine`, running your MINJA/injection benchmark set automatically. Security regressions in an agent-security product are the one class of bug you cannot ship.

### 4.7 Cost control at scale
- Autoscale `anomaly-service` and `healing-worker` on queue depth (KEDA + NATS JetStream consumer lag), not CPU — these are queue-driven services, CPU-based autoscaling will react too late.
- Spot/preemptible instances for model retraining jobs (not for the serving path).
- LLM cost: route triplet extraction through the smallest model that passes your eval set (`gpt-4o-mini` or an open-weight model self-hosted for high-volume Enterprise tenants) — this is a direct line item against your 78-82% gross margin target.

### 4.8 Disaster recovery
- Neo4j: scheduled snapshot exports + point-in-time recovery via Aura's backup feature (or `neo4j-admin backup` for self-hosted).
- Qdrant: snapshot API on a schedule, stored cross-region.
- Postgres: PITR via managed provider (Neon/Supabase both support this natively).
- Practice an actual restore quarterly — an audit-and-compliance product that can't prove its own DR story will lose Enterprise deals in security review, not in the demo.

---

## 5. Suggested Build Order (mapped to your existing 4-phase roadmap)

1. **Weeks 1–3** — `proxy-engine` fast path + `healing-worker` (async, NATS-based) + Postgres schema + basic OPA policies. Skip the portal UI entirely at this stage.
2. **Weeks 4–6** — `portal-web` with Clerk auth (defer WorkOS/enterprise SSO), 3D graph view reading from Neo4j via a thin internal API, Stripe billing wiring.
3. **Weeks 7–9** — `anomaly-service` as its own deployable with per-tenant models + Markov sequence scorer, red-team suite wired into CI, entity-resolution fix for contradiction detection.
4. **Weeks 10–12** — WorkOS enterprise SSO, dedicated-tenant provisioning script, audit-log export, multi-region deploy.

This order gets you a demoable, honestly-functioning product by week 6 without having promised ML sophistication (per-tenant anomaly models) before it exists.

---

## Appendix A: Data Normalization and Trust Score Conventions

These rules define the strict data normalization patterns and trust score conventions to be applied across the stack.

### 1. Triplet Normalization
- **Subject & Object**: Must be lowercased and whitespace-stripped (e.g., `triplet.subject.lower().strip()`). This ensures case-insensitive matching for Neo4j entity IDs during the entity resolution phase.
- **Predicate**: Must be UPPERCASE, whitespace-stripped, with spaces replaced by underscores (e.g., `triplet.predicate.upper().strip().replace(" ", "_")`). This maps directly to Neo4j relationship types, which cannot contain spaces. (e.g., "lives in" → "LIVES_IN").

### 2. Trust Score Validation
- Trust scores must strictly be a float bounded by `0.0 <= trust_score <= 1.0` inclusive.
- While the schemas validate the full range, services will assume the following semantic values:
  - `1.0` — Verified user-prompt origin.
  - `0.8`–`0.95` — Other trusted origins (varies by connector type).
  - `0.2` — Untrusted document/web-scrape origin, pre-poison-check.
  - `0.05` — Downgraded after matching a poison indicator.
- Threshold constants (e.g., `0.1` for marking edge status as `FLAGGED_POISON`, and `0.3` for restricted-tool filtering) belong in the OPA policy/firewall config, not hardcoded into the data schema.

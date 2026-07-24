$ErrorActionPreference = "Stop"

$rootDir = "D:\cortexshield"
$dirs = @(
    "apps/portal-web/src/app/(auth)",
    "apps/portal-web/src/app/(dashboard)/graph",
    "apps/portal-web/src/app/(dashboard)/audit-logs",
    "apps/portal-web/src/app/(dashboard)/policies",
    "apps/portal-web/src/app/(dashboard)/billing",
    "apps/portal-web/src/app/api",
    "apps/portal-web/src/components",
    "apps/portal-web/src/lib",
    "apps/portal-web/src/hooks",
    "apps/proxy-engine/cortex_proxy/ingress",
    "apps/proxy-engine/cortex_proxy/firewall",
    "apps/proxy-engine/cortex_proxy/egress",
    "apps/proxy-engine/cortex_proxy/cache",
    "apps/proxy-engine/tests",
    "apps/healing-worker/cortex_healing/extraction",
    "apps/healing-worker/cortex_healing/graph",
    "apps/healing-worker/cortex_healing/provenance",
    "apps/healing-worker/tests",
    "apps/anomaly-service/cortex_anomaly",
    "apps/anomaly-service/tests",
    "apps/policy-service/policies",
    "apps/policy-service/bundle-builder",
    "apps/billing-service/cortex_billing",
    "apps/docs-site",
    "packages/proxy-mcp-sdk",
    "packages/shared-types",
    "packages/ui",
    "packages/eslint-config",
    "packages/tsconfig",
    "libs/cortex_schemas",
    "libs/cortex_telemetry",
    "libs/cortex_neo4j_client",
    "libs/cortex_auth",
    "infra/terraform/modules/neo4j-aura",
    "infra/terraform/modules/qdrant",
    "infra/terraform/modules/postgres",
    "infra/terraform/modules/nats",
    "infra/terraform/modules/eks",
    "infra/terraform/modules/vault",
    "infra/terraform/environments/dev",
    "infra/terraform/environments/staging",
    "infra/terraform/environments/production",
    "infra/k8s/helm/proxy-engine",
    "infra/k8s/helm/healing-worker",
    "infra/k8s/helm/anomaly-service",
    "infra/k8s/helm/policy-service",
    "infra/k8s/argocd",
    ".github/workflows",
    "scripts",
    "docs/adr"
)

foreach ($d in $dirs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $rootDir $d) | Out-Null
}

$files = @{
    "pnpm-workspace.yaml" = "packages:`n  - `"apps/portal-web`"`n  - `"packages/*`"`n"
    "turbo.json" = "{`n  `"`$schema`": `"https://turbo.build/schema.json`",`n  `"tasks`": {`n    `"build`": {`n      `"dependsOn`": [`"^build`"],`n      `"outputs`": [`".next/**`", `"dist/**`"]`n    },`n    `"lint`": {`n      `"dependsOn`": [`"^lint`"]`n    },`n    `"dev`": {`n      `"cache`": false,`n      `"persistent`": true`n    }`n  }`n}`n"
    "pyproject.toml" = "[project]`nname = `"cortexshield`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Monorepo`"`nrequires-python = `">=3.12`"`ndependencies = []`n`n[tool.uv.workspace]`nmembers = [`n    `"apps/proxy-engine`",`n    `"apps/healing-worker`",`n    `"apps/anomaly-service`",`n    `"apps/policy-service`",`n    `"apps/billing-service`",`n    `"libs/*`"`n]`n"
    ".env.example" = "# ── Shared across all services ──────────────────────────────────`nNODE_ENV=development`nCORTEX_ENV=local                  # local | staging | production`nCORTEX_TENANT_ISOLATION_MODE=shared   # shared | dedicated (see §4.3)`n`n# ── Postgres (system of record: tenants, billing, RBAC) ─────────`nDATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield`n`n# ── Neo4j (cognitive graph) ──────────────────────────────────────`nNEO4J_URI=bolt://localhost:7687`nNEO4J_USER=neo4j`nNEO4J_PASSWORD=localdevpassword`n`n# ── Qdrant (vector store, entity resolution embeddings) ──────────`nQDRANT_URL=http://localhost:6333`nQDRANT_API_KEY=`n`n# ── Redis (rate limiting, trust-score cache) ──────────────────────`nREDIS_URL=redis://localhost:6379/0`n`n# ── NATS JetStream (async healing queue) ──────────────────────────`nNATS_URL=nats://localhost:4222`n`n# ── OPA (policy decision point) ────────────────────────────────────`nOPA_URL=http://localhost:8181/v1/data/cortexshield`n`n# ── Secrets management (production only, unused locally) ──────────`nVAULT_ADDR=`nVAULT_TOKEN=`n"
    "infra/docker-compose.yml" = "version: `"3.9`"`nservices:`n  neo4j:`n    image: neo4j:5-enterprise`n    environment:`n      - NEO4J_AUTH=neo4j/localdevpassword`n      - NEO4J_ACCEPT_LICENSE_AGREEMENT=yes`n    ports: [`"7474:7474`", `"7687:7687`"]`n    volumes: [`"neo4j_data:/data`"]`n`n  qdrant:`n    image: qdrant/qdrant:latest`n    ports: [`"6333:6333`"]`n    volumes: [`"qdrant_data:/qdrant/storage`"]`n`n  postgres:`n    image: postgres:16`n    environment:`n      - POSTGRES_USER=cortex`n      - POSTGRES_PASSWORD=localdevpassword`n      - POSTGRES_DB=cortexshield`n    ports: [`"5432:5432`"]`n    volumes: [`"pg_data:/var/lib/postgresql/data`"]`n`n  redis:`n    image: redis:7-alpine`n    ports: [`"6379:6379`"]`n`n  nats:`n    image: nats:2-alpine`n    command: [`"-js`"]`n    ports: [`"4222:4222`", `"8222:8222`"]`n`n  opa:`n    image: openpolicyagent/opa:latest`n    command: [`"run`", `"--server`", `"--addr=:8181`"]`n    ports: [`"8181:8181`"]`n`nvolumes:`n  neo4j_data:`n  qdrant_data:`n  pg_data:`n"
    "scripts/verify-local-stack.sh" = "#!/usr/bin/env bash`nset -e`n`necho `"Starting verification...`"`n`n# Check docker compose`necho `"Starting containers...`"`ndocker compose -f infra/docker-compose.yml up -d`n`necho `"Checking node dependencies...`"`npnpm install`n`necho `"Checking python dependencies...`"`nuv sync`n`necho `"Verification complete.`"`n"
    "scripts/seed-dev-data.py" = "# Placeholder`n"
    "scripts/run-redteam-suite.py" = "# Placeholder`n"
    "scripts/provision-tenant.sh" = "#!/usr/bin/env bash`n# Placeholder`n"
    "README.md" = "# CortexShield Monorepo`n"
    "apps/portal-web/README.md" = "# portal-web`n"
    "apps/proxy-engine/README.md" = "# proxy-engine`n"
    "apps/healing-worker/README.md" = "# healing-worker`n"
    "apps/anomaly-service/README.md" = "# anomaly-service`n"
    "apps/policy-service/README.md" = "# policy-service`n"
    "apps/billing-service/README.md" = "# billing-service`n"
    "apps/proxy-engine/cortex_proxy/main.py" = "print(`"proxy-engine entrypoint`")`n"
    "apps/proxy-engine/cortex_proxy/ingress/jsonrpc_interceptor.py" = ""
    "apps/proxy-engine/cortex_proxy/ingress/memory_ingest_fastpath.py" = ""
    "apps/proxy-engine/cortex_proxy/firewall/action_firewall.py" = ""
    "apps/proxy-engine/cortex_proxy/firewall/opa_client.py" = ""
    "apps/proxy-engine/cortex_proxy/firewall/anomaly_scorer.py" = ""
    "apps/proxy-engine/cortex_proxy/egress/response_sanitizer.py" = ""
    "apps/proxy-engine/cortex_proxy/cache/trust_score_cache.py" = ""
    "apps/proxy-engine/cortex_proxy/config.py" = ""
    "apps/proxy-engine/Dockerfile" = "FROM python:3.12-slim`n"
    "apps/proxy-engine/pyproject.toml" = "[project]`nname = `"proxy-engine`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Proxy Engine`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "apps/proxy-engine/.env.example" = "SERVICE_NAME=proxy-engine`nPORT=8000`nLOG_LEVEL=info`n`nNEO4J_URI=bolt://localhost:7687`nNEO4J_USER=neo4j`nNEO4J_PASSWORD=localdevpassword`n`nREDIS_URL=redis://localhost:6379/0`nNATS_URL=nats://localhost:4222`nOPA_URL=http://localhost:8181/v1/data/cortexshield`n`nFIREWALL_DEFAULT_RESTRICTED_TOOLS=send_webhook,execute_shell_command,drop_database_table,export_pii`nFIREWALL_MIN_TRUST_THRESHOLD=0.3`n`nCLERK_JWT_ISSUER=`nWORKOS_JWT_ISSUER=`n`nOTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`n"
    "apps/healing-worker/cortex_healing/worker.py" = "print(`"healing-worker entrypoint`")`n"
    "apps/healing-worker/cortex_healing/extraction/llm_triplet_extractor.py" = ""
    "apps/healing-worker/cortex_healing/extraction/entity_resolution.py" = ""
    "apps/healing-worker/cortex_healing/graph/cypher_queries.py" = ""
    "apps/healing-worker/cortex_healing/graph/contradiction_healer.py" = ""
    "apps/healing-worker/cortex_healing/graph/cycle_detector.py" = ""
    "apps/healing-worker/cortex_healing/provenance/trust_scorer.py" = ""
    "apps/healing-worker/Dockerfile" = "FROM python:3.12-slim`n"
    "apps/healing-worker/pyproject.toml" = "[project]`nname = `"healing-worker`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Healing Worker`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "apps/healing-worker/.env.example" = "SERVICE_NAME=healing-worker`nNATS_URL=nats://localhost:4222`nNATS_STREAM_NAME=MEMORY_WRITES`nNATS_CONSUMER_NAME=healing-worker-consumer`n`nNEO4J_URI=bolt://localhost:7687`nNEO4J_USER=neo4j`nNEO4J_PASSWORD=localdevpassword`n`nQDRANT_URL=http://localhost:6333`nENTITY_RESOLUTION_SIMILARITY_THRESHOLD=0.87`n`nLLM_PROVIDER=openai              # openai | anthropic | azure | local`nLLM_MODEL=gpt-4o-mini`nOPENAI_API_KEY=`nANTHROPIC_API_KEY=`nLOCAL_LLM_ENDPOINT=              # for data-residency Enterprise deployments`n`nPOISON_INDICATOR_TERMS=ignore previous,system rule:,exfiltrate`nPOISON_TRUST_SCORE=0.05`n"
    "apps/anomaly-service/cortex_anomaly/train.py" = ""
    "apps/anomaly-service/cortex_anomaly/serve.py" = "print(`"anomaly-service entrypoint`")`n"
    "apps/anomaly-service/cortex_anomaly/model_registry.py" = ""
    "apps/anomaly-service/cortex_anomaly/markov_sequence.py" = ""
    "apps/anomaly-service/Dockerfile" = "FROM python:3.12-slim`n"
    "apps/anomaly-service/pyproject.toml" = "[project]`nname = `"anomaly-service`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Anomaly Service`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "apps/anomaly-service/.env.example" = "SERVICE_NAME=anomaly-service`nPORT=8100`n`nMLFLOW_TRACKING_URI=http://localhost:5000`nMODEL_RETRAIN_INTERVAL_MINUTES=60`nANOMALY_CONTAMINATION_RATE=0.05`nPER_TENANT_MODEL_MIN_SAMPLES=500     # falls back to global prior below this`n`nREDIS_URL=redis://localhost:6379/1`nNEO4J_URI=bolt://localhost:7687`n"
    "apps/policy-service/Dockerfile" = "FROM openpolicyagent/opa:latest`n"
    "apps/policy-service/policies/restricted_tools.rego" = ""
    "apps/policy-service/policies/trust_thresholds.rego" = ""
    "apps/policy-service/policies/tenant_overrides.rego" = ""
    "apps/policy-service/pyproject.toml" = "[project]`nname = `"policy-service`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Policy Service`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "apps/policy-service/.env.example" = "SERVICE_NAME=policy-service`nOPA_BUNDLE_S3_BUCKET=cortexshield-opa-bundles`nOPA_BUNDLE_POLL_INTERVAL_SECONDS=30`nDATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield`n"
    "apps/billing-service/Dockerfile" = "FROM python:3.12-slim`n"
    "apps/billing-service/pyproject.toml" = "[project]`nname = `"billing-service`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Billing Service`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "apps/billing-service/.env.example" = "SERVICE_NAME=billing-service`nDATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield`nSTRIPE_SECRET_KEY=`nUSAGE_AGGREGATION_INTERVAL_MINUTES=15`n"
    "apps/portal-web/package.json" = "{`n  `"name`": `"portal-web`",`n  `"version`": `"0.1.0`",`n  `"private`": true,`n  `"scripts`": {`n    `"dev`": `"next dev`",`n    `"build`": `"next build`",`n    `"start`": `"next start`",`n    `"lint`": `"next lint`"`n  }`n}`n"
    "apps/portal-web/next.config.ts" = "export default {};`n"
    "apps/portal-web/.env.example" = "NEXT_PUBLIC_APP_URL=http://localhost:3000`n`n# Auth (dual-provider: Clerk for self-serve, WorkOS for enterprise SSO/SCIM)`nNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=`nCLERK_SECRET_KEY=`nWORKOS_API_KEY=`nWORKOS_CLIENT_ID=`n`nDATABASE_URL=postgresql://cortex:localdevpassword@localhost:5432/cortexshield`n`n# Billing`nSTRIPE_SECRET_KEY=`nSTRIPE_WEBHOOK_SECRET=`nNEXT_PUBLIC_STRIPE_PRICE_PRO=`nNEXT_PUBLIC_STRIPE_PRICE_GROWTH=`n`n# Graph API (server-side proxy to internal services — never exposed to browser directly)`nCORTEX_PROXY_INTERNAL_URL=http://proxy-engine:8000`nCORTEX_ANOMALY_INTERNAL_URL=http://anomaly-service:8100`n`n# Realtime graph updates`nNEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/graph`n"
    "libs/cortex_schemas/__init__.py" = "print(`"cortex_schemas entrypoint`")`n"
    "libs/cortex_schemas/pyproject.toml" = "[project]`nname = `"cortex_schemas`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Schemas`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "libs/cortex_telemetry/pyproject.toml" = "[project]`nname = `"cortex_telemetry`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Telemetry`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "libs/cortex_neo4j_client/pyproject.toml" = "[project]`nname = `"cortex_neo4j_client`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Neo4j Client`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "libs/cortex_auth/pyproject.toml" = "[project]`nname = `"cortex_auth`"`nversion = `"0.1.0`"`ndescription = `"CortexShield Auth`"`nrequires-python = `">=3.12`"`ndependencies = []`n"
    "packages/shared-types/index.ts" = "console.log(`"shared-types entrypoint`");`n"
    "packages/shared-types/package.json" = "{`n  `"name`": `"@cortexshield/shared-types`",`n  `"version`": `"0.1.0`",`n  `"private`": true`n}`n"
    "packages/proxy-mcp-sdk/package.json" = "{`n  `"name`": `"@cortexshield/proxy-mcp`",`n  `"version`": `"0.1.0`",`n  `"private`": true`n}`n"
    "packages/ui/package.json" = "{`n  `"name`": `"@cortexshield/ui`",`n  `"version`": `"0.1.0`",`n  `"private`": true`n}`n"
    "packages/eslint-config/package.json" = "{`n  `"name`": `"@cortexshield/eslint-config`",`n  `"version`": `"0.1.0`",`n  `"private`": true`n}`n"
    "packages/tsconfig/package.json" = "{`n  `"name`": `"@cortexshield/tsconfig`",`n  `"version`": `"0.1.0`",`n  `"private`": true`n}`n"
    ".github/workflows/ci.yml" = ""
    ".github/workflows/deploy-staging.yml" = ""
    ".github/workflows/deploy-production.yml" = ""
    "package.json" = "{`n  `"name`": `"cortexshield-monorepo`",`n  `"version`": `"0.1.0`",`n  `"private`": true,`n  `"scripts`": {`n    `"dev`": `"turbo run dev`",`n    `"build`": `"turbo run build`"`n  }`n}`n"
}

foreach ($key in $files.Keys) {
    $filepath = Join-Path $rootDir $key
    $parent = Split-Path -Parent $filepath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    Set-Content -Path $filepath -Value $files[$key] -Encoding UTF8
}

Write-Host "Scaffolding complete."

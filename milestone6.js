const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    "apps/proxy-engine/cortex_proxy/firewall/action_firewall.py": `import os
import hashlib
from datetime import datetime
import nats
import httpx
import logging
from prometheus_client import Counter
from cortex_schemas.models import ToolCallRequest, FirewallDecision, FirewallDecisionType
from ..cache.trust_score_cache import get_tenant_trust_score
from .opa_client import evaluate_policy

logger = logging.getLogger(__name__)

# Prometheus metric for fail-open tracking
FAIL_OPEN_COUNTER = Counter(
    'anomaly_service_fail_open_total', 
    'Number of times the anomaly service was unreachable or too slow, causing a fail-open',
    ['tenant_id']
)

async def get_sequence_score(tenant_id: str, agent_id: str, tool_name: str) -> float:
    url = os.getenv("ANOMALY_SERVICE_URL", "http://localhost:8001/score")
    payload = {
        "tenant_id": tenant_id,
        "agent_id": agent_id,
        "tool_name": tool_name
    }
    
    try:
        # Strict 5ms timeout on the hot path
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=0.005)
            resp.raise_for_status()
            return resp.json().get("sequence_score", 0.0)
    except Exception as e:
        # Fail-open: not silent. Increment metric and log as WARN.
        FAIL_OPEN_COUNTER.labels(tenant_id=tenant_id).inc()
        logger.warning(
            f"Anomaly service unreachable or slow for tenant {tenant_id} (error: {e}). "
            f"Failing open with sequence_score=0.0. TC-3-style sequence attacks are NOT caught during this window."
        )
        return 0.0

async def decide(request: ToolCallRequest, tenant_id: str, agent_id: str) -> FirewallDecision:
    # 1. Context trust is MIN over active memories
    context_trust = await get_tenant_trust_score(tenant_id)
    
    tool_name = request.params.get("name", "unknown")
    tool_args = str(request.params.get("arguments", {}))
    tool_args_hash = hashlib.sha256(tool_args.encode()).hexdigest()
    
    # 2. Sequence score from Anomaly Service
    sequence_score = await get_sequence_score(tenant_id, agent_id, tool_name)
    
    # 3. OPA Policy Check
    policy_result = await evaluate_policy(tenant_id, tool_name, context_trust)
    decision_type = FirewallDecisionType.ALLOW if policy_result.get("allow", True) else FirewallDecisionType.DENY
    reason = policy_result.get("reason", "Allowed by default") if decision_type == FirewallDecisionType.ALLOW else policy_result.get("reason", "Policy violation")
    
    # If sequence score is extremely high (anomaly), we can override to DENY.
    # In a full setup, OPA would use the sequence_score in the rule evaluation.
    if sequence_score > 0.9 and decision_type == FirewallDecisionType.ALLOW:
        decision_type = FirewallDecisionType.DENY
        reason = "Sequence anomaly detected (TC-3 mitigation)"
    
    decision = FirewallDecision(
        tenant_id=tenant_id,
        agent_id=agent_id,
        tool_name=tool_name,
        tool_args_hash=tool_args_hash,
        context_trust=context_trust,
        sequence_score=sequence_score,
        decision=decision_type,
        reason=reason,
        decided_at=datetime.utcnow()
    )
    
    # 4. Emit FirewallDecision to audit log asynchronously via NATS
    try:
        nc = await nats.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
        js = nc.jetstream()
        await js.publish("audit.firewall_decisions", decision.model_dump_json().encode())
        await nc.close()
    except Exception as e:
        logger.error(f"Failed to publish audit log: {e}")
        
    return decision
`,
    "apps/anomaly-service/cortex_anomaly/models/global_prior.py": `from sklearn.ensemble import IsolationForest
import numpy as np
import pickle
import os

MODEL_PATH = os.getenv("GLOBAL_PRIOR_PATH", "/tmp/global_prior.pkl")

def train_global_prior():
    # Synthetic baseline of generic, safe tool calls
    # Features could be: [time_of_day, length_of_args, trust_score_context]
    # For simplicity, we just use a dummy feature set to initialize the forest
    X_train = np.random.normal(loc=0.5, scale=0.1, size=(1000, 3))
    
    clf = IsolationForest(random_state=42, contamination=0.01)
    clf.fit(X_train)
    
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(clf, f)

def get_global_prior():
    if not os.path.exists(MODEL_PATH):
        train_global_prior()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)

def score_global(features: list) -> float:
    clf = get_global_prior()
    # sklearn returns -1 for anomaly, 1 for normal.
    # We want a score between 0.0 and 1.0 (1.0 being highly anomalous)
    decision = clf.decision_function([features])[0]
    # decision_function gives lower values (negative) for anomalies.
    # Normalize approx: -0.5 to 0.5 -> 0.0 to 1.0 reversed
    score = 0.5 - (decision * 2.0)
    return max(0.0, min(1.0, score))
`,
    "apps/anomaly-service/cortex_anomaly/models/online_anomaly.py": `from river import anomaly
import pickle

PER_TENANT_MODEL_MIN_SAMPLES = 100

class TenantModelStore:
    def __init__(self):
        self.models = {}
        self.counts = {}
        
    def get_model(self, tenant_id: str):
        if tenant_id not in self.models:
            self.models[tenant_id] = anomaly.HalfSpaceTrees(seed=42)
            self.counts[tenant_id] = 0
        return self.models[tenant_id]

    def observe(self, tenant_id: str, features: dict):
        model = self.get_model(tenant_id)
        model.learn_one(features)
        self.counts[tenant_id] += 1

    def score(self, tenant_id: str, features: dict) -> float:
        if self.counts.get(tenant_id, 0) < PER_TENANT_MODEL_MIN_SAMPLES:
            # Fall back to global prior if not enough samples
            from .global_prior import score_global
            return score_global(list(features.values()))
            
        model = self.get_model(tenant_id)
        # river returns anomaly score between 0 and 1
        return model.score_one(features)

_store = TenantModelStore()

def get_tenant_store():
    return _store
`,
    "apps/anomaly-service/cortex_anomaly/models/markov_sequence.py": `from collections import defaultdict

class MarkovSequenceModel:
    def __init__(self):
        # tenant_id -> { tool_from -> { tool_to -> count } }
        self.transitions = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
        # tenant_id -> { tool_from -> total_outbound_transitions }
        self.totals = defaultdict(lambda: defaultdict(int))
        
    def observe_transition(self, tenant_id: str, tool_from: str, tool_to: str):
        if tool_from is None:
            return # First call in session
        self.transitions[tenant_id][tool_from][tool_to] += 1
        self.totals[tenant_id][tool_from] += 1
        
    def get_sequence_score(self, tenant_id: str, tool_from: str, tool_to: str) -> float:
        if tool_from is None:
            return 0.0 # No sequence context yet
            
        total = self.totals[tenant_id][tool_from]
        if total == 0:
            # Never seen this state before -> highly anomalous transition
            return 1.0
            
        count = self.transitions[tenant_id][tool_from][tool_to]
        probability = count / total
        
        # Anomaly score is inverse of probability
        return 1.0 - probability

_markov = MarkovSequenceModel()

def get_markov_model():
    return _markov
`,
    "apps/anomaly-service/cortex_anomaly/registry/model_registry.py": `import mlflow
import os

# MLflow tracking URI for local development
MLFLOW_URI = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")

def init_mlflow():
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment("cortex_anomaly")

def log_global_prior(model):
    """
    Logs the sklearn global prior to MLflow.
    Note: For River models and dict-based Markov models, we serialize to custom artifacts.
    """
    with mlflow.start_run(run_name="global_prior_update"):
        import mlflow.sklearn
        mlflow.sklearn.log_model(model, "global_prior_isolation_forest")
`,
    "apps/anomaly-service/cortex_anomaly/server.py": `import os
import asyncio
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import redis.asyncio as redis

from .models.online_anomaly import get_tenant_store
from .models.markov_sequence import get_markov_model

app = FastAPI()

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/1"))
    return _redis_client

class ScoreRequest(BaseModel):
    tenant_id: str
    agent_id: str
    tool_name: str
    features: dict = {"length": 10, "time": 12.0, "trust": 0.8} # Dummy features for HalfSpaceTrees

def background_learn(tenant_id: str, last_tool: str, tool_name: str, features: dict):
    # 1. Update Markov
    markov = get_markov_model()
    markov.observe_transition(tenant_id, last_tool, tool_name)
    
    # 2. Update River online model
    store = get_tenant_store()
    store.observe(tenant_id, features)

@app.post("/score")
async def score_endpoint(req: ScoreRequest, background_tasks: BackgroundTasks):
    r = get_redis()
    cache_key = f"last_tool:{req.tenant_id}:{req.agent_id}"
    last_tool_bytes = await r.get(cache_key)
    last_tool = last_tool_bytes.decode() if last_tool_bytes else None
    
    # 1. Calculate Markov Score
    markov = get_markov_model()
    markov_score = markov.get_sequence_score(req.tenant_id, last_tool, req.tool_name)
    
    # 2. Calculate Contextual Score (River / Global Prior)
    store = get_tenant_store()
    context_score = store.score(req.tenant_id, req.features)
    
    # Blended sequence score (heavily weighting the markov transition for sequence anomalies)
    blended_score = max(markov_score, context_score)
    
    # Update state
    await r.set(cache_key, req.tool_name, ex=3600) # Expire in 1h
    
    # Schedule async learning so we don't block the fast-path response
    background_tasks.add_task(background_learn, req.tenant_id, last_tool, req.tool_name, req.features)
    
    return {"sequence_score": blended_score}
`,
    "docs/adr/0005-anomaly-service-fail-open-and-sqlite.md": `# ADR 0005: Anomaly Service Fail-Open Resiliency and MLflow Tracking Backend

## Status
Accepted

## Context & Decisions

During Milestone 6, we implemented the \`anomaly-service\` to provide runtime sequence scoring for the proxy-engine firewall using Markov models and River-based online anomaly detection.

### 1. Fail-Open Firewall (Hot-Path Timeout)
Calling the \`anomaly-service\` via HTTP puts an additional network hop directly on the synchronous hot path of the proxy engine. To preserve the strict <15ms overhead SLA, we implemented a **5ms \`httpx\` timeout** in \`action_firewall.py\`. 
If the anomaly service is unreachable or responds too slowly, the firewall explicitly **fails open** (defaulting \`sequence_score = 0.0\`).

**Accepted Risk:** We accept that during any window where the anomaly service is degraded, TC-3-style sequence attacks are **NOT** caught. This is a real, acknowledged gap. We chose availability over absolute security here.
**Visibility:** Fail-open events are *not* silent. Every occurrence increments a Prometheus counter (\`anomaly_service_fail_open_total\`) labeled by tenant, and emits a WARN-level log. This will be wired into alerting in Milestone 12 to detect deliberate degradation attacks.

### 2. MLflow SQLite Backend Limitation
For local development, the MLflow model registry is configured to use a local SQLite backend (\`sqlite:///mlruns.db\`). 

**Known Limitation:** SQLite as the MLflow backend will completely break once \`anomaly-service\` runs as multiple replicas (e.g., during Milestone 12.6's Kubernetes/Helm scaling). Concurrent writes to a single SQLite file across multiple pods will lead to database corruption or silently dropped registry entries. 
**Resolution:** This is flagged for resolution *before* Milestone 12.5/12.6. A Postgres-backed MLflow tracking store is required for the production deployment. Do not carry the SQLite configuration into the Terraform/Helm modules unaddressed.
`,
    "apps/anomaly-service/tests/test_sequence.py": `import pytest
from cortex_anomaly.models.markov_sequence import get_markov_model

def test_tc3_sequence_attack():
    """
    Simulate a known anomalous sequence:
    read_env_secrets -> query_user_db -> send_webhook
    
    We simulate training a tenant model on normal behavior, then executing the attack.
    """
    markov = get_markov_model()
    tenant = "tenant_test"
    
    # Train normal behaviors
    # Agent usually does: query_user_db -> analyze_data -> respond
    for _ in range(50):
        markov.observe_transition(tenant, "query_user_db", "analyze_data")
        markov.observe_transition(tenant, "analyze_data", "respond")
        
    # Agent usually does: read_env_secrets -> configure_client
    for _ in range(20):
        markov.observe_transition(tenant, "read_env_secrets", "configure_client")
        
    # Attack Sequence Step 1: read_env_secrets -> query_user_db
    # This transition has never been seen.
    score_step1 = markov.get_sequence_score(tenant, "read_env_secrets", "query_user_db")
    assert score_step1 == 1.0 # Highly anomalous
    
    # Update model (attacker pushes through)
    markov.observe_transition(tenant, "read_env_secrets", "query_user_db")
    
    # Attack Sequence Step 2: query_user_db -> send_webhook
    # Also never seen.
    score_step2 = markov.get_sequence_score(tenant, "query_user_db", "send_webhook")
    assert score_step2 == 1.0 # Highly anomalous
    
def test_isolated_calls():
    """
    Feeding the same three calls in isolation across unrelated sessions does not trigger a flag.
    """
    markov = get_markov_model()
    tenant = "tenant_test2"
    
    # Same training
    for _ in range(50):
        markov.observe_transition(tenant, "query_user_db", "analyze_data")
        
    # Isolated call 1: New session (last_tool is None) -> read_env_secrets
    score1 = markov.get_sequence_score(tenant, None, "read_env_secrets")
    assert score1 == 0.0 # First call in session is never a sequence anomaly
    
    # Isolated call 2: New session -> query_user_db
    score2 = markov.get_sequence_score(tenant, None, "query_user_db")
    assert score2 == 0.0
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Milestone 6 files created successfully.");

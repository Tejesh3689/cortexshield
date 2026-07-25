"""
CortexShield Anomaly Service — TC-3 sequence attack detection.
Port: 8100

Implements Markov chain transition scoring over a Redis-backed per-tenant
tool call sequence history. Blocks suspicious sequences like read_secrets->webhook.
"""
import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
import redis.asyncio as redis
from fastapi import FastAPI
from pydantic import BaseModel

# Load .env from the anomaly-service directory regardless of cwd
_HERE = os.path.dirname(os.path.abspath(__file__))
_ENV_PATH = os.path.join(_HERE, "..", ".env")  # apps/anomaly-service/.env
load_dotenv(_ENV_PATH, override=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("anomaly-service")

app = FastAPI(title="CortexShield Anomaly Service")

# Markov transition table: high probability = normal, low = suspicious
TRANSITION_SCORES: dict[tuple, float] = {
    ("read_file",        "read_file"):     0.9,
    ("read_file",        "db_query"):      0.8,
    ("db_query",         "write_doc"):     0.7,
    ("add_memory",       "add_memory"):    0.9,
    ("get_memory",       "add_memory"):    0.8,
    ("read_env_secrets", "send_webhook"):  0.05,
    ("db_query",         "send_webhook"):  0.05,
    ("query_user_db",    "send_webhook"):  0.05,
}

READ_TOOLS = frozenset({
    "read_file", "read_env_secrets", "db_query", "query_user_db",
    "get_memory", "list_files", "fetch_url"
})

ANOMALY_THRESHOLD = 0.1
HISTORY_LENGTH = 10
HISTORY_TTL = 3600

_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/1"))
    return _redis_client


def _score_transition(last_tool: Optional[str], current_tool: str,
                      history: list[str]) -> tuple[float, str]:
    # Compound rule: send_webhook after 2+ reads in recent history
    if current_tool == "send_webhook" and last_tool is not None:
        recent_reads = sum(1 for t in history[-5:] if t in READ_TOOLS)
        if recent_reads >= 2:
            return 0.02, f"Suspicious: {recent_reads} read ops then send_webhook"

    key = (last_tool, current_tool)
    if key in TRANSITION_SCORES:
        score = TRANSITION_SCORES[key]
        reason = (f"Suspicious: {last_tool}->{current_tool}" if score <= ANOMALY_THRESHOLD
                  else f"Normal: {last_tool}->{current_tool}")
        return score, reason

    if last_tool is None:
        return 0.5, "First call in session"

    return 0.5, f"Unknown transition: {last_tool}->{current_tool}"


class ScoreRequest(BaseModel):
    tenant_id: str
    agent_id: str
    tool_name: str


class ScoreResponse(BaseModel):
    sequence_score: float
    is_anomaly: bool
    reason: str


@app.post("/score", response_model=ScoreResponse)
async def score(req: ScoreRequest):
    r = get_redis()
    hist_key = f"seq:{req.tenant_id}:{req.agent_id}"
    score_key = f"scores:{req.tenant_id}:{req.agent_id}"

    raw = await r.get(hist_key)
    history: list[str] = json.loads(raw) if raw else []
    last_tool = history[-1] if history else None

    transition_score, reason = _score_transition(last_tool, req.tool_name, history)

    raw_scores = await r.get(score_key)
    recent_scores: list[float] = json.loads(raw_scores) if raw_scores else []
    recent_scores.append(transition_score)
    recent_scores = recent_scores[-3:]
    rolling_score = sum(recent_scores) / len(recent_scores)

    # is_anomaly is true when ANY recent transition is below the threshold.
    # Using min() ensures a single suspicious call (e.g. 0.02) always triggers
    # the block even when earlier transitions were neutral (0.5).
    is_anomaly = min(recent_scores) < ANOMALY_THRESHOLD

    history.append(req.tool_name)
    history = history[-HISTORY_LENGTH:]
    await r.set(hist_key, json.dumps(history), ex=HISTORY_TTL)
    await r.set(score_key, json.dumps(recent_scores), ex=HISTORY_TTL)

    log_fn = logger.warning if is_anomaly else logger.info
    log_fn(f"tenant={req.tenant_id} tool={req.tool_name} last={last_tool} "
           f"rolling={rolling_score:.2f} anomaly={is_anomaly}")

    return ScoreResponse(sequence_score=rolling_score, is_anomaly=is_anomaly, reason=reason)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "anomaly-service"}

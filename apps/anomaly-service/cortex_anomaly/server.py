import os
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

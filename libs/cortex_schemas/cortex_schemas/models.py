from datetime import datetime
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator
import uuid

class OriginSource(str, Enum):
    USER_PROMPT = "USER_PROMPT"
    UNTRUSTED_DOC = "UNTRUSTED_DOC"
    WEB_SCRAPE = "WEB_SCRAPE"
    EXTERNAL_FETCH = "EXTERNAL_FETCH"

class EdgeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    FLAGGED_POISON = "FLAGGED_POISON"

class FirewallDecisionType(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"

class MemoryWriteJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    agent_id: str
    raw_text: str
    origin_source: OriginSource
    submitted_at: datetime
    doc_id: Optional[str] = None
    document_hash: Optional[str] = None
    source_type: str = "unknown"
    tool_name: Optional[str] = None
    request_id: Optional[str] = None

class Triplet(BaseModel):
    subject: str
    predicate: str
    object: str

    @field_validator('subject', 'object')
    def normalize_entity(cls, v: str) -> str:
        return v.lower().strip()

    @field_validator('predicate')
    def normalize_predicate(cls, v: str) -> str:
        return v.upper().strip().replace(" ", "_")

class MemoryEdge(BaseModel):
    predicate: str
    status: EdgeStatus
    trust_score: float = Field(ge=0.0, le=1.0)
    origin: str
    created_at: datetime
    superseded_at: Optional[datetime] = None

class FirewallDecision(BaseModel):
    tenant_id: str
    agent_id: str
    tool_name: str
    tool_args_hash: str
    context_trust: float
    sequence_score: float
    decision: FirewallDecisionType
    reason: str
    decided_at: datetime

class ToolCallRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: dict[str, Any]
    id: str | int

class ToolCallResponse(BaseModel):
    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[dict[str, Any]] = None
    id: str | int

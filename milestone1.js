const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    "libs/cortex_schemas/cortex_schemas/__init__.py": "from .models import (\n    OriginSource,\n    EdgeStatus,\n    FirewallDecisionType,\n    MemoryWriteJob,\n    Triplet,\n    MemoryEdge,\n    FirewallDecision,\n    ToolCallRequest,\n    ToolCallResponse\n)\n",
    "libs/cortex_schemas/cortex_schemas/models.py": `from datetime import datetime
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

class OriginSource(str, Enum):
    USER_PROMPT = "USER_PROMPT"
    UNTRUSTED_DOC = "UNTRUSTED_DOC"
    WEB_SCRAPE = "WEB_SCRAPE"

class EdgeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    FLAGGED_POISON = "FLAGGED_POISON"

class FirewallDecisionType(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"

class MemoryWriteJob(BaseModel):
    tenant_id: str
    agent_id: str
    raw_text: str
    origin_source: OriginSource
    submitted_at: datetime

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
`,
    "libs/cortex_schemas/tests/test_schemas.py": `import pytest
from datetime import datetime
from pydantic import ValidationError
from cortex_schemas.models import (
    OriginSource, EdgeStatus, FirewallDecisionType,
    MemoryWriteJob, Triplet, MemoryEdge, FirewallDecision
)

def test_triplet_normalization():
    t = Triplet(subject="  John Doe ", predicate=" lives in ", object="San Francisco  ")
    assert t.subject == "john doe"
    assert t.predicate == "LIVES_IN"
    assert t.object == "san francisco"

def test_trust_score_validation_valid():
    edge = MemoryEdge(
        predicate="KNOWS",
        status=EdgeStatus.ACTIVE,
        trust_score=0.85,
        origin="USER_PROMPT",
        created_at=datetime.utcnow()
    )
    assert edge.trust_score == 0.85

def test_trust_score_validation_invalid_high():
    with pytest.raises(ValidationError):
        MemoryEdge(
            predicate="KNOWS",
            status=EdgeStatus.ACTIVE,
            trust_score=1.1,
            origin="USER_PROMPT",
            created_at=datetime.utcnow()
        )

def test_trust_score_validation_invalid_low():
    with pytest.raises(ValidationError):
        MemoryEdge(
            predicate="KNOWS",
            status=EdgeStatus.ACTIVE,
            trust_score=-0.1,
            origin="USER_PROMPT",
            created_at=datetime.utcnow()
        )

def test_enum_validation():
    # Valid assignments
    job = MemoryWriteJob(
        tenant_id="t1",
        agent_id="a1",
        raw_text="hello",
        origin_source=OriginSource.WEB_SCRAPE,
        submitted_at=datetime.utcnow()
    )
    assert job.origin_source == OriginSource.WEB_SCRAPE

    # Invalid assignments
    with pytest.raises(ValidationError):
        MemoryWriteJob(
            tenant_id="t1",
            agent_id="a1",
            raw_text="hello",
            origin_source="INVALID_ORIGIN",
            submitted_at=datetime.utcnow()
        )
`,
    "libs/cortex_telemetry/cortex_telemetry/__init__.py": "from .otel import setup_otel\n",
    "libs/cortex_telemetry/cortex_telemetry/otel.py": `import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

def setup_otel(service_name: str):
    """
    Sets up OpenTelemetry tracing for the given service.
    Expects OTEL_EXPORTER_OTLP_ENDPOINT to be present in the environment.
    """
    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)

    # Standard OTLP Exporter (will read endpoint from OTEL_EXPORTER_OTLP_ENDPOINT)
    otlp_exporter = OTLPSpanExporter()
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider)
`,
    "libs/cortex_neo4j_client/cortex_neo4j_client/__init__.py": "from .client import get_driver\n",
    "libs/cortex_neo4j_client/cortex_neo4j_client/client.py": `import os
from neo4j import GraphDatabase, Driver

_driver_instance = None

def get_driver() -> Driver:
    """
    Returns a connection-pooled Neo4j driver singleton using environment variables.
    """
    global _driver_instance
    if _driver_instance is None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        
        _driver_instance = GraphDatabase.driver(uri, auth=(user, password))
    
    return _driver_instance
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

console.log("Milestone 1 execution complete.");

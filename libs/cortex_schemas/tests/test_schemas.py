import pytest
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

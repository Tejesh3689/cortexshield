import os
from typing import List
from cortex_neo4j_client.client import get_driver
from cortex_schemas.models import Triplet, EdgeStatus

async def heal_graph(tenant_id: str, triplets: List[Triplet], trust_score: float, is_poison: bool):
    driver = get_driver()
    status = EdgeStatus.FLAGGED_POISON if is_poison or trust_score < 0.1 else EdgeStatus.ACTIVE
    
    query = """
    UNWIND $triplets as t
    
    // Merge Subject
    MERGE (s:Entity {id: t.subject, tenant_id: $tenant_id})
    
    // Merge Object
    MERGE (o:Entity {id: t.object, tenant_id: $tenant_id})
    
    // Supersede old active edges of the same predicate for this subject
    WITH s, o, t
    MATCH (s)-[old_r]->(other_o)
    WHERE type(old_r) = t.predicate AND old_r.status = 'ACTIVE' AND id(other_o) <> id(o)
    SET old_r.status = 'SUPERSEDED', old_r.superseded_at = datetime()
    
    // Create new edge
    WITH s, o, t
    CALL apoc.create.relationship(s, t.predicate, {
        status: $status,
        trust_score: $trust_score,
        created_at: datetime()
    }, o) YIELD rel
    RETURN count(rel)
    """
    
    # Needs APOC in Neo4j, or standard Cypher dynamic relationship workarounds.
    # We will use standard Cypher for simplicity if APOC isn't guaranteed, but APOC is standard in Aura.
    # Note: APOC procedure syntax requires CALL. 
    
    with driver.session() as session:
        session.run(query, tenant_id=tenant_id, triplets=[t.model_dump() for t in triplets], status=status.value, trust_score=trust_score)

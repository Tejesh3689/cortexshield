import os
import logging
from typing import List
from cortex_neo4j_client.client import get_driver
from cortex_schemas.models import Triplet, EdgeStatus

logger = logging.getLogger(__name__)


async def heal_graph(tenant_id: str, triplets: List[Triplet], trust_score: float, is_poison: bool):
    driver = get_driver()
    status = EdgeStatus.FLAGGED_POISON if is_poison or trust_score < 0.1 else EdgeStatus.ACTIVE

    query = """
    UNWIND $triplets as t

    // Merge Subject
    MERGE (s:Entity {id: t.subject, tenant_id: $tenant_id})

    // Merge Object
    MERGE (o:Entity {id: t.object, tenant_id: $tenant_id})

    // Supersede old active edges of the same predicate for this subject.
    // Uses elementId() (not deprecated id()) to correctly distinguish nodes.
    WITH s, o, t
    OPTIONAL MATCH (s)-[old_r]->(other_o)
    WHERE type(old_r) = t.predicate
    AND old_r.status = 'ACTIVE'
    AND elementId(other_o) <> elementId(o)
    FOREACH (_ IN CASE WHEN old_r IS NOT NULL THEN [1] ELSE [] END |
        SET old_r.status = 'SUPERSEDED', old_r.superseded_at = datetime()
    )

    // Create new edge
    WITH DISTINCT s, o, t
    CALL apoc.create.relationship(s, t.predicate, {
        status: $status,
        trust_score: $trust_score,
        created_at: datetime()
    }, o) YIELD rel
    RETURN count(rel)
    """

    with driver.session() as session:
        logger.info(f"Received triplets: {triplets}")
        params = {
            "tenant_id": tenant_id,
            "triplets": [t.model_dump() for t in triplets],
            "status": status.value,
            "trust_score": trust_score,
        }
        logger.info(f"Executing Cypher query: {query}")
        logger.info(f"With parameters: {params}")

        result = session.run(query, **params)
        summary = result.consume()
        logger.info(
            f"Neo4j write summary: "
            f"Nodes created: {summary.counters.nodes_created}, "
            f"Relationships created: {summary.counters.relationships_created}, "
            f"Properties set: {summary.counters.properties_set}"
        )

    # ── Post-write: Broadcast to realtime-gateway ──────────────────────────
    # Fire-and-forget HTTP POST — gateway down never blocks healing.
    try:
        from cortex_healing.broadcaster import broadcast_graph_update
        subject_ids = list({t.subject for t in triplets})
        await broadcast_graph_update(
            tenant_id=tenant_id,
            update_type="write",
            data={"subjects": subject_ids, "status": status.value},
        )
    except Exception as e:
        logger.debug(f"broadcast_graph_update failed (non-fatal): {e}")

    # ── Post-write: Local subgraph cycle detection (TC-5) ─────────────────
    # Run cycle detection on the 2-hop subgraph of affected subjects only.
    try:
        from cortex_healing.graph.cycle_detector import detect_cycles_local
        subject_ids = [t.subject for t in triplets]
        cycles_broken = await detect_cycles_local(tenant_id, subject_ids)
        if cycles_broken:
            logger.info(f"heal_graph: broke {cycles_broken} cycle(s) in tenant {tenant_id} after write")
    except Exception as e:
        logger.error(f"Cycle detection failed (non-fatal): {e}", exc_info=True)

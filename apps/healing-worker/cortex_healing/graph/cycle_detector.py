"""
cycle_detector.py — Cycle detection using networkx.

Two modes:
  detect_and_break_cycles(tenant_id)   — full-tenant graph scan (periodic healing job)
  detect_cycles_local(tenant_id, subjects) — 2-hop subgraph from affected subjects
                                              (called after every Neo4j write in
                                              contradiction_healer.heal_graph)

In both cases: if a cycle is found, the NEWEST edge (highest created_at) is
marked SUPERSEDED to break the cycle. This implements TC-5 from the test matrix.
"""
import logging
from typing import List

import networkx as nx
from cortex_neo4j_client.client import get_driver

logger = logging.getLogger(__name__)


async def detect_cycles_local(tenant_id: str, subject_ids: List[str]) -> int:
    """
    Fetch a 2-3 hop subgraph rooted at `subject_ids` and run cycle detection.
    Supersedes the NEWEST edge in each detected cycle (newest loses so the
    most recent contradictory claim is removed, keeping the prior consensus).

    Returns the number of cycles broken.
    """
    if not subject_ids:
        return 0

    driver = get_driver()

    # Fetch active edges in the 2-hop neighbourhood of the affected subjects
    query = """
    UNWIND $subject_ids AS sid
    MATCH path = (s:Entity {id: sid, tenant_id: $tenant_id})-[r*1..3]->(o)
    WHERE ALL(rel IN relationships(path) WHERE rel.status = 'ACTIVE')
    UNWIND relationships(path) AS rel
    WITH DISTINCT
        startNode(rel).id AS source,
        endNode(rel).id   AS target,
        elementId(rel)    AS rel_id,
        rel.created_at    AS created_at
    RETURN source, target, rel_id, created_at
    """

    with driver.session() as session:
        result = session.run(query, subject_ids=subject_ids, tenant_id=tenant_id)
        edges = [record for record in result]

    if not edges:
        return 0

    G = nx.DiGraph()
    for e in edges:
        # networkx MultiDiGraph is safer here but DiGraph is fine for simple paths
        G.add_edge(
            e["source"],
            e["target"],
            rel_id=e["rel_id"],
            created_at=e["created_at"],
        )

    cycles_broken = 0
    try:
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            cycle_edges = []
            for i in range(len(cycle)):
                u = cycle[i]
                v = cycle[(i + 1) % len(cycle)]
                if G.has_edge(u, v):
                    cycle_edges.append((u, v, G[u][v]))

            if not cycle_edges:
                continue

            # Supersede the NEWEST edge (highest created_at) — newest claim loses
            newest_edge = max(cycle_edges, key=lambda x: x[2].get("created_at") or "")
            u, v, attrs = newest_edge
            rel_id = attrs["rel_id"]

            cycle_path = "→".join(cycle + [cycle[0]])
            logger.info(
                f"Cycle detected: {cycle_path}, resolved by superseding newest edge "
                f"{u}→{v} (elementId={rel_id})"
            )

            break_query = """
            MATCH ()-[r]->()
            WHERE elementId(r) = $rel_id
            SET r.status = 'SUPERSEDED', r.superseded_at = datetime()
            """
            with driver.session() as session:
                session.run(break_query, rel_id=rel_id)

            cycles_broken += 1
            G.remove_edge(u, v)

    except nx.NetworkXNoCycle:
        pass

    return cycles_broken


async def detect_and_break_cycles(tenant_id: str) -> int:
    """
    Full-tenant graph cycle detection. Called by the periodic healing job.
    Supersedes the OLDEST edge in each cycle (oldest loses in full scan mode
    to preserve the most recent consensus across the whole graph).

    Returns the number of cycles broken.
    """
    driver = get_driver()

    query = """
    MATCH (s:Entity {tenant_id: $tenant_id})-[r]->(o:Entity {tenant_id: $tenant_id})
    WHERE r.status = 'ACTIVE'
    RETURN s.id as source, o.id as target, elementId(r) as rel_id, r.created_at as created_at
    """

    with driver.session() as session:
        result = session.run(query, tenant_id=tenant_id)
        edges = [record for record in result]

    if not edges:
        return 0

    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e["source"], e["target"], rel_id=e["rel_id"], created_at=e["created_at"])

    cycles_broken = 0
    try:
        cycles = list(nx.simple_cycles(G))
        for cycle in cycles:
            cycle_edges = []
            for i in range(len(cycle)):
                u = cycle[i]
                v = cycle[(i + 1) % len(cycle)]
                if G.has_edge(u, v):
                    cycle_edges.append((u, v, G[u][v]))

            if not cycle_edges:
                continue

            # Supersede the OLDEST edge to break cycle (full-graph periodic scan)
            oldest_edge = min(cycle_edges, key=lambda x: x[2].get("created_at") or "")
            u, v, attrs = oldest_edge
            rel_id = attrs["rel_id"]

            break_query = """
            MATCH ()-[r]->()
            WHERE elementId(r) = $rel_id
            SET r.status = 'SUPERSEDED', r.superseded_at = datetime()
            """
            with driver.session() as session:
                session.run(break_query, rel_id=rel_id)

            cycles_broken += 1
            G.remove_edge(u, v)

    except nx.NetworkXNoCycle:
        pass

    return cycles_broken

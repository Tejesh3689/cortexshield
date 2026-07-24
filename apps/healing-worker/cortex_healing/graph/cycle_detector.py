import networkx as nx
from cortex_neo4j_client.client import get_driver

async def detect_and_break_cycles(tenant_id: str) -> int:
    """Uses networkx to detect circular contradictions and temporal recency to break them."""
    driver = get_driver()
    
    # 1. Fetch active edges for tenant
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
            # Find the oldest edge in the cycle (temporal recency: newest wins, oldest loses)
            cycle_edges = []
            for i in range(len(cycle)):
                u = cycle[i]
                v = cycle[(i+1) % len(cycle)]
                cycle_edges.append(G[u][v])
                
            if not cycle_edges:
                continue
                
            oldest_edge = min(cycle_edges, key=lambda x: x["created_at"])
            rel_id = oldest_edge["rel_id"]
            
            # Supersede the oldest edge to break cycle
            break_query = """
            MATCH ()-[r]->()
            WHERE elementId(r) = $rel_id
            SET r.status = 'SUPERSEDED', r.superseded_at = datetime()
            """
            with driver.session() as session:
                session.run(break_query, rel_id=rel_id)
            
            cycles_broken += 1
            # Remove from graph so we don't double count if overlapping
            G.remove_edge(u, v)
            
    except nx.NetworkXNoCycle:
        pass
        
    return cycles_broken

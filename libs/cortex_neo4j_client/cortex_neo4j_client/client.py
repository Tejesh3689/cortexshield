import os
import asyncpg
from neo4j import GraphDatabase, Driver, AsyncGraphDatabase

_driver_instance = None
# In-memory cache to prevent DB lookup on every call
_tenant_db_cache = {}

def get_driver() -> Driver:
    """
    Returns a connection-pooled Neo4j driver singleton.
    """
    global _driver_instance
    if _driver_instance is None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "localdevpassword")
        
        _driver_instance = GraphDatabase.driver(uri, auth=(user, password))
    
    return _driver_instance

async def get_tenant_database_name(tenant_id: str) -> str:
    """
    Resolves the tenant_id to their specific neo4j_database_name.
    """
    if tenant_id in _tenant_db_cache:
        return _tenant_db_cache[tenant_id]
        
    try:
        conn = await asyncpg.connect(os.getenv("DATABASE_URL", "postgresql://cortex:localdevpassword@localhost:5432/cortexshield"))
        row = await conn.fetchrow("SELECT neo4j_database_name, tier FROM tenants WHERE id = $1", tenant_id)
        await conn.close()
        
        if row:
            db_name = row["neo4j_database_name"]
            tier = row["tier"]
            # Pro tenants share the default database
            if tier == "pro":
                db_name = None
                
            _tenant_db_cache[tenant_id] = db_name
            return db_name
    except Exception:
        pass
        
    return None # fallback default

async def get_tenant_session(tenant_id: str, driver: Driver = None):
    """
    Yields a Neo4j session dynamically routed to the tenant's isolated database.
    If the tenant is enterprise, it ideally targets a different URI altogether,
    but here we target the isolated database or dedicated container logically.
    """
    if driver is None:
        driver = get_driver()
        
    db_name = await get_tenant_database_name(tenant_id)
    return driver.session(database=db_name) if db_name else driver.session()

async def get_decision_provenance(decision_id: str, tenant_id: str) -> dict:
    """Returns the full provenance chain for a firewall decision."""
    cypher = """
    MATCH (d:AuditDecision {tenant_id: $tenant})
    WHERE d.id = $decision_id OR d.audit_log_ref = $decision_id
    OPTIONAL MATCH (d)-[ib:INFLUENCED_BY]->(s:Entity)-[ef:EXTRACTED_FROM]->(doc:SourceDocument)-[:ARRIVED_VIA]->(tc:ToolCall)
    WHERE ib.fact_type = ef.fact_type
    RETURN d as decision,
           collect({
             fact_type: ib.fact_type,
             trust_contribution: ib.trust_contribution,
             source_document: doc.id,
             source_type: doc.source_type,
             arrived_via: tc.tool_name,
             received_at: doc.received_at
           }) as provenance_chain
    """
    
    driver = get_driver()
    db_name = await get_tenant_database_name(tenant_id)
    
    # We must use the synchronous API properly here since driver is sync.
    # We can run it in a thread or just execute synchronously for the hackathon.
    with (driver.session(database=db_name) if db_name else driver.session()) as session:
        result = session.run(cypher, decision_id=decision_id, tenant=tenant_id)
        record = result.single()
        if not record:
            return None
            
        decision_node = record["decision"]
        if not decision_node:
            return None
            
        return {
            "decision": dict(decision_node),
            "provenance_chain": record["provenance_chain"]
        }

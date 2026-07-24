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
                db_name = "neo4j"
                
            _tenant_db_cache[tenant_id] = db_name
            return db_name
    except Exception:
        pass
        
    return "neo4j" # fallback default

async def get_tenant_session(tenant_id: str, driver: Driver = None):
    """
    Yields a Neo4j session dynamically routed to the tenant's isolated database.
    If the tenant is enterprise, it ideally targets a different URI altogether,
    but here we target the isolated database or dedicated container logically.
    """
    if driver is None:
        driver = get_driver()
        
    db_name = await get_tenant_database_name(tenant_id)
    return driver.session(database=db_name)

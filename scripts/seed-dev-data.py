# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "asyncpg>=0.28.0",
#     "neo4j>=5.14.0",
#     "python-dotenv>=1.0.0",
# ]
# ///
import os
import asyncio
import hashlib
import secrets
from pathlib import Path

import asyncpg
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

# Load .env from the repository root
root_dir = Path(__file__).resolve().parent.parent
load_dotenv(root_dir / ".env", override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cortex:localdevpassword@localhost:5432/cortexshield")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "localdevpassword")

TENANTS = [
    {"id": "tenant_pro_1", "name": "Acme Pro", "tier": "pro", "db": "neo4j"},
    {"id": "tenant_growth_1", "name": "Globex Growth", "tier": "growth", "db": "neo4j_tenant_growth_1"},
    {"id": "tenant_ent_1", "name": "Initech Enterprise", "tier": "enterprise", "db": "neo4j_tenant_ent_1"}
]

async def seed_postgres():
    conn = await asyncpg.connect(DATABASE_URL)
    
    generated_keys = {}
    
    print("--- Seeding Postgres Data ---")
    for t in TENANTS:
        # 1. Insert Tenant
        await conn.execute(
            """
            INSERT INTO tenants (id, name, tier, neo4j_database_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET tier = EXCLUDED.tier
            """,
            t["id"], t["name"], t["tier"], t["db"]
        )
        
        # 2. Generate and Insert API Key
        raw_key = f"sk_{t['tier']}_{secrets.token_hex(16)}"
        key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
        
        key_id = f"key_{secrets.token_hex(4)}"
        await conn.execute(
            """
            INSERT INTO api_keys (id, tenant_id, key_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO NOTHING
            """,
            key_id, t["id"], key_hash
        )
        
        generated_keys[t["name"]] = raw_key
        print(f"Provisioned {t['name']} ({t['tier']})")
        
    await conn.close()
    return generated_keys

async def seed_neo4j():
    print("\n--- Seeding Neo4j Cognitive Graph Data ---")
    
    driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    # We will seed data for the PRO tenant (shared default database)
    # This guarantees it works immediately on a fresh docker-compose up without needing 
    # to run the provision-tenant.sh script for the Enterprise databases first.
    
    tenant_id = "tenant_pro_1"
    
    async with driver.session(database="neo4j") as session:
        # Clear existing dev data for this tenant
        await session.run("MATCH (n {tenant_id: $t}) DETACH DELETE n", t=tenant_id)
        
        # 1. ACTIVE State Fact
        await session.run("""
            MERGE (s:Entity {id: 'user_alice', tenant_id: $t})
            MERGE (o:Entity {id: 'admin_role', tenant_id: $t})
            MERGE (s)-[r:HAS_ROLE {
                tenant_id: $t, 
                status: 'ACTIVE',
                trust_score: 0.95,
                source: 'admin_panel'
            }]->(o)
        """, t=tenant_id)
        
        # 2. SUPERSEDED State Fact
        await session.run("""
            MERGE (s:Entity {id: 'user_bob', tenant_id: $t})
            MERGE (o1:Entity {id: 'sales_dept', tenant_id: $t})
            MERGE (s)-[r:WORKS_IN {
                tenant_id: $t, 
                status: 'SUPERSEDED',
                trust_score: 0.80,
                superseded_by: 'rel_bob_engineering'
            }]->(o1)
            
            MERGE (o2:Entity {id: 'engineering_dept', tenant_id: $t})
            MERGE (s)-[r2:WORKS_IN {
                tenant_id: $t,
                status: 'ACTIVE',
                trust_score: 0.90,
                id: 'rel_bob_engineering'
            }]->(o2)
        """, t=tenant_id)
        
        # 3. FLAGGED_POISON State Fact (Anomaly Detected)
        await session.run("""
            MERGE (s:Entity {id: 'system_prompt', tenant_id: $t})
            MERGE (o:Entity {id: 'ignore_previous_instructions', tenant_id: $t})
            MERGE (s)-[r:INSTRUCTS {
                tenant_id: $t, 
                status: 'FLAGGED_POISON',
                trust_score: 0.05,
                source: 'untrusted_user_input',
                anomaly_reason: 'Detected jailbreak attempt matching prior cycle'
            }]->(o)
        """, t=tenant_id)
        
        print(f"Successfully seeded graph nodes (ACTIVE, SUPERSEDED, FLAGGED_POISON) for {tenant_id}")
        
    await driver.close()

async def main():
    try:
        keys = await seed_postgres()
        await seed_neo4j()
        
        print("\n=======================================================")
        print("SEEDING COMPLETE. Use the following API Keys for testing:")
        for name, key in keys.items():
            print(f"- {name}: {key}")
        print("=======================================================")
    except Exception as e:
        print(f"Failed to seed data: {e}")
        print("Ensure 'docker compose up' is running locally.")

if __name__ == "__main__":
    asyncio.run(main())

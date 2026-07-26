import asyncio
import os
import sys
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

async def run_migration():
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    USER = os.getenv("NEO4J_USER", "neo4j")
    PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    driver = AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))
    try:
        async with driver.session() as session:
            print("Starting Neo4j migration for temporal attack detection...")
            query = """
            MATCH ()-[r]->()
            WHERE r.reference_count IS NULL
            SET r.reference_count = 0,
                r.last_referenced_at = null,
                r.reference_history = []
            RETURN count(r) as updated_count
            """
            result = await session.run(query)
            record = await result.single()
            print(f"Migration complete. Updated {record['updated_count']} edges.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        await driver.close()

if __name__ == "__main__":
    asyncio.run(run_migration())

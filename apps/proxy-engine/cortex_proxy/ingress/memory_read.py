import os
from neo4j import AsyncGraphDatabase
from cortex_schemas.models import ToolCallRequest, ToolCallResponse

async def get_neo4j_session():
    URI = os.getenv("NEO4J_URI")
    USER = os.getenv("NEO4J_USER")
    PASSWORD = os.getenv("NEO4J_PASSWORD")
    driver = AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))
    return driver

async def handle_get_memory(request: ToolCallRequest, tenant_id: str, agent_id: str) -> ToolCallResponse:
    subject = request.params.get("arguments", {}).get("subject")
    if not subject:
        return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "Missing 'subject'"}], "isError": True})
    
    driver = await get_neo4j_session()
    try:
        async with driver.session() as session:
            query = """
            MATCH (s:Entity {id: $subject, tenant_id: $tenant_id})-[r]->(o:Entity)
            WHERE r.status = 'ACTIVE'
            RETURN type(r) as predicate, o.id as object, r.trust_score as trust
            ORDER BY r.created_at DESC
            """
            result = await session.run(query, subject=subject, tenant_id=tenant_id)
            records = await result.data()
            
            if not records:
                return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "No facts stored yet for this subject."}], "isError": False})
                
            lines = [f"Facts about {subject}:"]
            for record in records:
                lines.append(f"- {record['predicate']}: {record['object']} (trust: {record['trust']})")
                
            output = "\n".join(lines)
            return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": output}], "isError": False})
    finally:
        await driver.close()

async def handle_search_memory(request: ToolCallRequest, tenant_id: str, agent_id: str) -> ToolCallResponse:
    query_str = request.params.get("arguments", {}).get("query")
    if not query_str:
        return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "Missing 'query'"}], "isError": True})
        
    driver = await get_neo4j_session()
    try:
        async with driver.session() as session:
            cypher = """
            MATCH (s:Entity {tenant_id: $tenant_id})-[r]->(o:Entity)
            WHERE r.status = 'ACTIVE' AND (
                toLower(s.id) CONTAINS toLower($query) OR
                toLower(o.id) CONTAINS toLower($query) OR
                toLower(type(r)) CONTAINS toLower($query)
            )
            RETURN s.id as subject, type(r) as predicate, o.id as object, r.trust_score as trust
            ORDER BY r.trust_score DESC LIMIT 5
            """
            result = await session.run(cypher, query=query_str, tenant_id=tenant_id)
            records = await result.data()
            
            if not records:
                return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": "No matching facts found."}], "isError": False})
                
            lines = [f"Top 5 matches for '{query_str}':"]
            for record in records:
                lines.append(f"- {record['subject']} {record['predicate']} {record['object']} (trust: {record['trust']})")
                
            output = "\n".join(lines)
            return ToolCallResponse(id=request.id, result={"content": [{"type": "text", "text": output}], "isError": False})
    finally:
        await driver.close()

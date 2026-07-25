from neo4j import GraphDatabase

URI = "neo4j+ssc://744ad83e.databases.neo4j.io"
AUTH = ("744ad83e", "0SyfJz3g1J88FqstFsKqsDynRzwP5AGjyjwmYBTRNgs")

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    with driver.session() as session:
        result = session.run("MATCH (d:AuditDecision {decision: 'DENY'}) OPTIONAL MATCH (d)-[ib:INFLUENCED_BY]->(s:Entity)-[ef:EXTRACTED_FROM]->(doc:SourceDocument)-[:ARRIVED_VIA]->(tc:ToolCall) WHERE ib.fact_type = ef.fact_type RETURN d.id as decision_id, ib.fact_type as fact_type, doc.id as doc_id, tc.tool_name as tc_tool, doc.source_type as source_type")
        for record in result:
            print(record)

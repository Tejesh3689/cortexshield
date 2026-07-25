from neo4j import GraphDatabase

URI = "neo4j+ssc://744ad83e.databases.neo4j.io"
AUTH = ("744ad83e", "0SyfJz3g1J88FqstFsKqsDynRzwP5AGjyjwmYBTRNgs")

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    with driver.session() as session:
        result = session.run("MATCH (n) RETURN count(n) AS c")
        print("Nodes:", result.single()["c"])
        
        result = session.run("MATCH ()-[r]->() RETURN count(r) AS c")
        print("Edges:", result.single()["c"])
        
        result = session.run("MATCH (n) WHERE n.status <> 'ACTIVE' RETURN n.id, n.status, labels(n)")
        for record in result:
            print("Non-active Node:", record)
            
        result = session.run("MATCH ()-[r]->() WHERE r.status <> 'ACTIVE' RETURN type(r), r.status")
        for record in result:
            print("Non-active Edge:", record)

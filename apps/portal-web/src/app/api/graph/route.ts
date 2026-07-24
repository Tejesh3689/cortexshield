import { NextResponse } from "next/server";
import neo4j from "neo4j-driver";

export async function GET() {
  const uri = process.env.NEO4J_URI || "neo4j+ssc://744ad83e.databases.neo4j.io";
  const user = process.env.NEO4J_USER || "744ad83e";
  const password = process.env.NEO4J_PASSWORD || "0SyfJz3g1J88FqstFsKqsDynRzwP5AGjyjwmYBTRNgs";

  // Use neo4j+ssc if neo4j+s fails SSL verification in NodeJS
  const driverUri = uri.startsWith("neo4j+s://") ? uri.replace("neo4j+s://", "neo4j+ssc://") : uri;

  try {
    const driver = neo4j.driver(driverUri, neo4j.auth.basic(user, password));
    const session = driver.session();

    // Fetch all nodes
    const nodeResult = await session.run(
      `MATCH (n) 
       RETURN id(n) as internalId, labels(n) as labels, properties(n) as props`
    );

    // Fetch all relationships
    const relResult = await session.run(
      `MATCH (a)-[r]->(b) 
       RETURN id(a) as sourceId, id(b) as targetId, type(r) as relType, properties(a) as aProps, properties(b) as bProps`
    );

    await session.close();
    await driver.close();

    const nodes = nodeResult.records.map((rec) => {
      const props = rec.get("props") || {};
      const labels = rec.get("labels") || [];
      const internalId = rec.get("internalId").toString();
      const nodeId = props.id || props.node_id || `neo4j_${internalId}`;
      const label = props.label || props.name || props.id || labels[0] || `Node ${internalId}`;

      // Determine status: ACTIVE (green/blue), FLAGGED_POISON (red), SUPERSEDED (gray)
      let status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED" = "ACTIVE";
      if (
        props.status === "FLAGGED_POISON" ||
        labels.includes("Poisoned") ||
        labels.includes("PoisonedFragment") ||
        String(nodeId).includes("ignore_previous") ||
        String(nodeId).includes("poison")
      ) {
        status = "FLAGGED_POISON";
      } else if (props.status === "SUPERSEDED" || labels.includes("Superseded")) {
        status = "SUPERSEDED";
      } else if (props.status === "ACTIVE") {
        status = "ACTIVE";
      }

      return {
        id: String(nodeId),
        internalId,
        label: String(label),
        status,
        type: props.type || (status === "FLAGGED_POISON" ? "POISONED_FRAGMENT" : labels[0] || "SHORT_TERM"),
        val: status === "FLAGGED_POISON" ? 15 : status === "SUPERSEDED" ? 10 : 13,
        memoryHash: props.memoryHash || props.hash || `0x${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
        vectorDimension: props.vectorDimension || "1536 (text-embedding-3-large)",
        similarityScore: props.similarityScore ?? (status === "FLAGGED_POISON" ? 0.12 : status === "SUPERSEDED" ? 0.45 : 0.94),
        decayFactor: props.decayFactor ?? (status === "FLAGGED_POISON" ? 0.05 : status === "SUPERSEDED" ? 0.30 : 0.95),
        retentionPolicy: props.retentionPolicy || (status === "FLAGGED_POISON" ? "Quarantined / Flagged" : status === "SUPERSEDED" ? "Archived / Superseded" : "Active Context"),
        accessCount: props.accessCount ?? (status === "FLAGGED_POISON" ? 12 : status === "SUPERSEDED" ? 45 : 420),
        tenant: props.tenant_id || props.tenant || "tenant_pro_1",
        timestamp: props.timestamp || new Date().toISOString().replace("T", " ").slice(0, 19),
        content: props.content || props.text || `Neo4j Node Payload: ${label} (Tenant: ${props.tenant_id || "tenant_pro_1"})`,
        source: "neo4j",
      };
    });

    const links = relResult.records.map((rec) => {
      const aProps = rec.get("aProps") || {};
      const bProps = rec.get("bProps") || {};
      const sourceId = aProps.id || aProps.node_id || `neo4j_${rec.get("sourceId").toString()}`;
      const targetId = bProps.id || bProps.node_id || `neo4j_${rec.get("targetId").toString()}`;
      return {
        source: String(sourceId),
        target: String(targetId),
        label: rec.get("relType"),
      };
    });

    if (nodes.length > 0) {
      return NextResponse.json({
        success: true,
        source: "Neo4j Aura (Live Database)",
        nodeCount: nodes.length,
        edgeCount: links.length,
        nodes,
        links,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error("Neo4j query error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to connect to Neo4j",
    }, { status: 500 });
  }

  return NextResponse.json({
    success: false,
    error: "No nodes found in Neo4j",
  });
}

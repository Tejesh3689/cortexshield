import os
import uuid
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from cortex_proxy.db import get_db_session
from neo4j import AsyncGraphDatabase

router = APIRouter()

class AlertStatusUpdate(BaseModel):
    status: str

def get_neo4j_driver():
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    USER = os.getenv("NEO4J_USER", "neo4j")
    PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    return AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))

def clean_neo4j_records(records):
    import neo4j.time
    for r in records:
        for k, v in r.items():
            if isinstance(v, neo4j.time.DateTime):
                r[k] = v.to_native().isoformat() + "Z"
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        for ik, iv in item.items():
                            if isinstance(iv, neo4j.time.DateTime):
                                item[ik] = iv.to_native().isoformat() + "Z"
    return records

@router.get("/")
async def get_alerts(tenant_id: str = Query(...)):
    driver = get_neo4j_driver()
    try:
        async with driver.session() as session:
            cypher = """
            MATCH (alert)
            WHERE (alert:TemporalAlert OR alert:BehavioralAlert) AND alert.tenant_id = $tenant AND alert.status = 'OPEN'
            OPTIONAL MATCH (alert)-[:FLAGGED]->(s:Entity)-[r]->(o:Entity)
            WHERE elementId(r) = alert.edge_element_id
            RETURN alert.id as id, alert.alert_type as alert_type, alert.detected_at as detected_at,
                   alert.fact_age_days as fact_age_days, alert.reference_count as reference_count,
                   alert.trust_score as trust_score, alert.status as status,
                   alert.agent_id as agent_id, alert.deviation_score as deviation_score, alert.tool_name as tool_name,
                   s.id as subject, type(r) as predicate, o.id as object, r.origin as origin, alert.edge_element_id as edge_id
            ORDER BY alert.detected_at DESC
            """
            result = await session.run(cypher, tenant=tenant_id)
            records = await result.data()
            return clean_neo4j_records(records)
    finally:
        await driver.close()

@router.patch("/{alert_id}")
async def update_alert(alert_id: str, payload: AlertStatusUpdate, tenant_id: str = Query(...), db: AsyncSession = Depends(get_db_session)):
    valid_statuses = ["OPEN", "ACKNOWLEDGED", "DISMISSED", "CONFIRMED_ATTACK"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    driver = get_neo4j_driver()
    try:
        async with driver.session() as session:
            cypher = """
            MATCH (alert) 
            WHERE alert.id = $alert_id AND alert.tenant_id = $tenant AND (alert:TemporalAlert OR alert:BehavioralAlert)
            SET alert.status = $status
            RETURN alert.edge_element_id as edge_id, labels(alert) as labels
            """
            result = await session.run(cypher, alert_id=alert_id, tenant=tenant_id, status=payload.status)
            record = await result.single()
            if not record:
                raise HTTPException(status_code=404, detail="Alert not found")
            
            edge_id = record.get("edge_id")
            labels = record.get("labels", [])
            
            if payload.status == "CONFIRMED_ATTACK" and "TemporalAlert" in labels and edge_id:
                # Quarantine the fact
                quarantine_cypher = """
                MATCH ()-[r]->() WHERE elementId(r) = $edge_id
                SET r.status = 'FLAGGED_POISON',
                    r.trust_score = 0.05
                """
                await session.run(quarantine_cypher, edge_id=edge_id)
                
                # Write to audit_log_index
                event_id = str(uuid.uuid4())
                this_hash = hashlib.sha256(f"manual_quarantine:{edge_id}:{tenant_id}".encode()).hexdigest()
                await db.execute(
                    text("""
                    INSERT INTO audit_log_index (id, tenant_id, event_type, event_ref, this_hash)
                    VALUES (:id, :tenant_id, 'manual_quarantine', :edge_element_id, :this_hash)
                    """),
                    {"id": event_id, "tenant_id": tenant_id, "edge_element_id": edge_id, "this_hash": this_hash}
                )
                await db.commit()
                
            return {"status": "success", "alert_id": alert_id, "new_status": payload.status}
    finally:
        await driver.close()

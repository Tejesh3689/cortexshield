import asyncio
import os
import uuid
import logging
from datetime import datetime
from neo4j import AsyncGraphDatabase
from sqlalchemy.future import select
from cortex_proxy.db import async_session_maker
from cortex_db.models import TenantPolicy, Tenant, AuditLogIndex

logger = logging.getLogger(__name__)

async def detect_sleeper_attacks():
    """Scheduled job to detect sleeper attacks across all tenants."""
    logger.info("Running sleeper attack detection job...")
    
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    USER = os.getenv("NEO4J_USER", "neo4j")
    PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # Run across all tenants
    async with async_session_maker() as db:
        result = await db.execute(select(Tenant))
        tenants = result.scalars().all()
        
        for tenant in tenants:
            tenant_id = tenant.id
            
            # Fetch policies
            policy_res = await db.execute(select(TenantPolicy).where(TenantPolicy.tenant_id == tenant_id))
            policy = policy_res.scalars().first()
            
            age_threshold = (policy.sleeper_age_threshold_days if policy and policy.sleeper_age_threshold_days is not None else 7)
            spike_threshold = (policy.sleeper_reference_spike_threshold if policy and policy.sleeper_reference_spike_threshold is not None else 3)
            trust_ceiling = (policy.sleeper_trust_ceiling if policy and policy.sleeper_trust_ceiling is not None else 0.5)
            
            driver = AsyncGraphDatabase.driver(URI, auth=(USER, PASSWORD))
            try:
                async with driver.session() as session:
                    cypher = """
                    MATCH (s:Entity {tenant_id: $tenant})-[r]->(o:Entity)
                    WHERE r.status = 'ACTIVE'
                    AND coalesce(r.reference_count, 0) >= $spike_threshold
                    AND r.created_at < datetime() - duration('P' + $age_days + 'D')
                    AND r.trust_score < $trust_ceiling
                    AND r.last_referenced_at > datetime() - duration('PT2H')
                    AND r.origin <> 'USER_PROMPT'
                    RETURN s.id as subject, type(r) as predicate, o.id as object,
                           r.trust_score as trust_score, r.reference_count as reference_count, 
                           r.created_at as created_at,
                           r.last_referenced_at as last_referenced_at, r.origin as origin, elementId(r) as edge_id,
                           duration.between(r.created_at, datetime()).days as age_days
                    ORDER BY r.reference_count DESC
                    """
                    res = await session.run(
                        cypher, 
                        tenant=tenant_id, 
                        spike_threshold=spike_threshold,
                        age_days=str(age_threshold),
                        trust_ceiling=trust_ceiling
                    )
                    records = await res.data()
                    
                    for record in records:
                        edge_id = record["edge_id"]
                        
                        # Check if alert already exists for this edge
                        check_cypher = "MATCH (a:TemporalAlert {edge_element_id: $edge_id}) RETURN a"
                        check_res = await session.run(check_cypher, edge_id=edge_id)
                        existing_alert = await check_res.data()
                        if existing_alert:
                            continue # Alert already exists
                        
                        alert_id = str(uuid.uuid4())
                        
                        create_alert = """
                        MATCH (s:Entity {tenant_id: $tenant})-[r]->(o:Entity) WHERE elementId(r) = $edge_id
                        CREATE (alert:TemporalAlert {
                            id: $alert_id,
                            tenant_id: $tenant,
                            edge_element_id: $edge_id,
                            alert_type: 'SLEEPER_ACTIVATION',
                            detected_at: datetime(),
                            fact_age_days: $age_days,
                            reference_count: $count,
                            trust_score: $trust,
                            status: 'OPEN'
                        })
                        CREATE (alert)-[:FLAGGED]->(s)
                        RETURN alert
                        """
                        await session.run(
                            create_alert, 
                            tenant=tenant_id, 
                            edge_id=edge_id, 
                            alert_id=alert_id,
                            age_days=record["age_days"],
                            count=record["reference_count"],
                            trust=record["trust_score"]
                        )
                        
                        # Write to postgres audit log
                        # Note: generating dummy hashes for this background job
                        audit_log = AuditLogIndex(
                            id=str(uuid.uuid4()),
                            tenant_id=tenant_id,
                            event_type="temporal_alert",
                            event_ref=alert_id,
                            prev_hash="system_generated",
                            this_hash="system_generated"
                        )
                        db.add(audit_log)
                        await db.commit()
                        
                        logger.warning(f"Temporal Alert generated for tenant {tenant_id}: {record['subject']} {record['predicate']} {record['object']}")
            finally:
                await driver.close()

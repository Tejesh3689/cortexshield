from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from cortex_proxy.db import get_db_session
from cortex_db.models import AgentBehavioralProfile

router = APIRouter()

@router.get("/profiles")
async def get_agent_profiles(tenant_id: str = Query(...), db: AsyncSession = Depends(get_db_session)):
    res = await db.execute(
        select(AgentBehavioralProfile)
        .where(AgentBehavioralProfile.tenant_id == tenant_id)
        .where(AgentBehavioralProfile.is_stable == True)
        .order_by(AgentBehavioralProfile.updated_at.desc())
    )
    profiles = res.scalars().all()
    
    # Only return the latest stable profile per agent
    seen_agents = set()
    result = []
    for p in profiles:
        if p.agent_id not in seen_agents:
            seen_agents.add(p.agent_id)
            result.append({
                "agent_id": p.agent_id,
                "tool_distribution": p.tool_distribution,
                "avg_content_length_bytes": p.avg_content_length_bytes,
                "stddev_content_length_bytes": p.stddev_content_length_bytes,
                "hourly_distribution": p.hourly_distribution,
                "total_calls": p.total_calls,
                "is_stable": p.is_stable,
                "updated_at": p.updated_at.isoformat() + "Z" if p.updated_at else None
            })
            
    return {"profiles": result}

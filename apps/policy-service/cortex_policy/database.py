import os
import asyncpg
import logging
import json

logger = logging.getLogger(__name__)

async def get_db_connection():
    return await asyncpg.connect(os.getenv("DATABASE_URL", "postgresql://cortex:localdevpassword@localhost:5432/cortexshield"))

async def get_all_overrides():
    try:
        conn = await get_db_connection()
        rows = await conn.fetch("SELECT tenant_id, rule_type, rule_value FROM tenant_overrides")
        await conn.close()
        
        # We need to map to the structure bundle_builder expects
        # rule_value is jsonb.
        # rule_type == 'trust_threshold' -> threshold float
        # rule_type == 'restricted_tool_override' -> egress action string
        
        thresholds = {}
        egress = {}
        
        for row in rows:
            t_id = row["tenant_id"]
            val = json.loads(row["rule_value"]) if isinstance(row["rule_value"], str) else row["rule_value"]
            
            if row["rule_type"] == "trust_threshold":
                thresholds[t_id] = val.get("threshold") if isinstance(val, dict) else val
            elif row["rule_type"] == "egress_action":
                egress[t_id] = val.get("action") if isinstance(val, dict) else val
                
        return {
            "thresholds": thresholds,
            "egress": egress
        }
    except Exception as e:
        logger.error(f"Failed to get overrides: {e}")
        return {"thresholds": {}, "egress": {}}

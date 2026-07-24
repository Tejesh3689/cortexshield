const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

const files = {
    // ---------------------------------------------------------
    // apps/policy-service/cortex_policy/database.py
    // ---------------------------------------------------------
    "apps/policy-service/cortex_policy/database.py": `import os
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
`,
    // ---------------------------------------------------------
    // apps/policy-service/cortex_policy/server.py
    // ---------------------------------------------------------
    "apps/policy-service/cortex_policy/server.py": `import os
import asyncio
from fastapi import FastAPI
from fastapi.responses import FileResponse
from .bundle_builder import build_bundle_if_changed, BUNDLE_DIR

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    # Removed init_db() call. The schema is fully managed by Alembic in Milestone 2.
    await build_bundle_if_changed()
    asyncio.create_task(poll_for_changes())
    
async def poll_for_changes():
    interval = int(os.getenv("OPA_BUNDLE_POLL_INTERVAL_SECONDS", "5"))
    while True:
        await asyncio.sleep(interval)
        try:
            await build_bundle_if_changed()
        except Exception as e:
            import logging
            logging.error(f"Error rebuilding bundle: {e}")

@app.get("/bundles/bundle.tar.gz")
async def get_bundle():
    bundle_path = os.path.join(BUNDLE_DIR, "bundle.tar.gz")
    return FileResponse(bundle_path, media_type="application/gzip")
`,
    // ---------------------------------------------------------
    // libs/cortex_db/cortex_db/models.py
    // ---------------------------------------------------------
    "libs/cortex_db/cortex_db/models.py": `from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String(255), primary_key=True)
    name = Column(String(255), nullable=False)
    tier = Column(String(50), nullable=False) # pro | growth | enterprise
    neo4j_database_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_customer_id = Column(String(255), nullable=True)
    provisioning_status = Column(String(50), nullable=True)

class TenantOverride(Base):
    __tablename__ = "tenant_overrides"
    tenant_id = Column(String(255), ForeignKey("tenants.id"), primary_key=True)
    rule_type = Column(String(50), primary_key=True)
    rule_value = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    key_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

class UsageCounter(Base):
    __tablename__ = "usage_counters"
    tenant_id = Column(String(255), ForeignKey("tenants.id"), primary_key=True)
    period_start = Column(DateTime, primary_key=True)
    operation_count = Column(Integer, default=0)
    tool_call_count = Column(Integer, default=0)

class AuditLogIndex(Base):
    __tablename__ = "audit_log_index"
    id = Column(String(255), primary_key=True)
    tenant_id = Column(String(255), ForeignKey("tenants.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_ref = Column(String(255), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    this_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
`,
    // ---------------------------------------------------------
    // Alembic migration 002
    // ---------------------------------------------------------
    "libs/cortex_db/alembic/versions/002_tenant_overrides.py": `"""Tenant Overrides

Revision ID: 002_tenant_overrides
Revises: 001_initial_schema
Create Date: 2026-07-24 10:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '002_tenant_overrides'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First, drop the dynamically created tables from M5/M7 if they exist in the DB already
    op.execute("DROP TABLE IF EXISTS tenant_overrides")
    op.execute("DROP TABLE IF EXISTS tenant_egress_overrides")
    
    op.create_table('tenant_overrides',
        sa.Column('tenant_id', sa.String(length=255), nullable=False),
        sa.Column('rule_type', sa.String(length=50), nullable=False),
        sa.Column('rule_value', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('tenant_id', 'rule_type')
    )


def downgrade() -> None:
    op.drop_table('tenant_overrides')
`
};

for (const [filepath, content] of Object.entries(files)) {
    const fullPath = path.join(rootDir, filepath);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
}

console.log("Tenant Overrides migration files created successfully.");

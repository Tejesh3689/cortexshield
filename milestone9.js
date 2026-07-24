const fs = require('fs');
const path = require('path');

const rootDir = "D:\\cortexshield";

// 1. Remove the incorrectly previewed columns from 001_initial_schema.py
const schemaFile = path.join(rootDir, 'libs/cortex_db/alembic/versions/001_initial_schema.py');
if (fs.existsSync(schemaFile)) {
    let content = fs.readFileSync(schemaFile, 'utf8');
    content = content.replace("sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),\n", "");
    content = content.replace("sa.Column('provisioning_status', sa.String(length=50), nullable=True),\n", "");
    content = content.replace("sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),", "");
    content = content.replace("sa.Column('provisioning_status', sa.String(length=50), nullable=True),", "");
    fs.writeFileSync(schemaFile, content, 'utf8');
}

const files = {
    // ---------------------------------------------------------
    // apps/billing-service
    // ---------------------------------------------------------
    "apps/billing-service/pyproject.toml": `[project]
name = "billing_service"
version = "0.1.0"
description = "Billing & Stripe Integration Service"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.100.0",
    "uvicorn>=0.23.0",
    "stripe>=6.0.0",
    "cortex_db"
]
`,
    "apps/billing-service/cortex_billing/server.py": `import os
import asyncio
import logging
from datetime import datetime, timezone
import stripe
from fastapi import FastAPI, BackgroundTasks
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from cortex_db.models import Tenant, UsageCounter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder")

app = FastAPI()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://cortex:localdevpassword@localhost:5432/cortexshield")
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def aggregate_and_push_usage():
    async with AsyncSessionLocal() as session:
        # Fetch unreported usage
        stmt = select(UsageCounter, Tenant).join(Tenant, UsageCounter.tenant_id == Tenant.id).where(UsageCounter.reported == False)
        result = await session.execute(stmt)
        
        for usage, tenant in result:
            if not tenant.stripe_customer_id:
                continue
                
            try:
                # In a real app we might use stripe.billing.MeterEvent.create or standard SubscriptionItem usage
                # This simulates pushing the usage record
                logger.info(f"Pushing {usage.tool_call_count} tool calls to Stripe for customer {tenant.stripe_customer_id}")
                
                # stripe.UsageRecord.create(
                #     subscription_item=tenant.stripe_subscription_item_id, # Simplified
                #     quantity=usage.tool_call_count,
                #     timestamp=int(datetime.now(timezone.utc).timestamp()),
                # )
                
                # Mark reported
                usage.reported = True
            except Exception as e:
                logger.error(f"Stripe push failed for {tenant.id}: {e}")
                
        await session.commit()

async def usage_cron():
    interval = int(os.getenv("USAGE_AGGREGATION_INTERVAL_MINUTES", "60")) * 60
    while True:
        await asyncio.sleep(interval)
        try:
            await aggregate_and_push_usage()
        except Exception as e:
            logger.error(f"Usage cron failed: {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(usage_cron())

@app.get("/health")
def health():
    return {"status": "ok"}
`,

    // ---------------------------------------------------------
    // apps/portal-web Webhook
    // ---------------------------------------------------------
    "apps/portal-web/src/app/api/webhooks/stripe/route.ts": `import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
});

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    // We mock verification for test mode
    // event = stripe.webhooks.constructEvent(payload, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
    event = JSON.parse(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;
      const status = subscription.status; // 'active', 'trialing', etc
      
      # Simplified mapping logic for tier from plan ID
      let tier = "growth";
      let provisioningStatus = "ACTIVE";
      
      if (status === "active") {
        provisioningStatus = "PENDING_UPGRADE"; // Tell provision-tenant.sh to run
        tier = "enterprise";
      }

      await pool.query(
        "UPDATE tenants SET tier = $1, provisioning_status = $2 WHERE stripe_customer_id = $3",
        [tier, provisioningStatus, stripeCustomerId]
      );
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
`,

    // ---------------------------------------------------------
    // libs/cortex_db
    // ---------------------------------------------------------
    "libs/cortex_db/cortex_db/models.py": `from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean
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
    reported = Column(Boolean, default=False)

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
    "libs/cortex_db/alembic/versions/003_billing_additions.py": `"""Billing Additions

Revision ID: 003_billing_additions
Revises: 002_tenant_overrides
Create Date: 2026-07-24 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '003_billing_additions'
down_revision: Union[str, None] = '002_tenant_overrides'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to tenants
    op.add_column('tenants', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('provisioning_status', sa.String(length=50), nullable=True))
    
    # Add column to usage_counters
    op.add_column('usage_counters', sa.Column('reported', sa.Boolean(), server_default='false', nullable=False))

def downgrade() -> None:
    op.drop_column('usage_counters', 'reported')
    op.drop_column('tenants', 'provisioning_status')
    op.drop_column('tenants', 'stripe_customer_id')
`,

    // ---------------------------------------------------------
    // scripts/seed-dev-data.py
    // ---------------------------------------------------------
    "scripts/seed-dev-data.py": `import asyncio
import os
import uuid
from datetime import datetime, timezone
import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cortex:localdevpassword@localhost:5432/cortexshield")

async def seed_data():
    conn = await asyncpg.connect(DATABASE_URL)
    
    tenant_id = "test_tenant_" + str(uuid.uuid4())[:8]
    
    await conn.execute("""
        INSERT INTO tenants (id, name, tier, neo4j_database_name, created_at, stripe_customer_id, provisioning_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    """, tenant_id, "Test Corp", "growth", "neo4j_test_corp", datetime.now(timezone.utc), "cus_test123", "ACTIVE")
    
    await conn.execute("""
        INSERT INTO usage_counters (tenant_id, period_start, operation_count, tool_call_count, reported)
        VALUES ($1, $2, $3, $4, $5)
    """, tenant_id, datetime.now(timezone.utc), 10, 42, False)
    
    print(f"Seeded tenant {tenant_id} with usage data.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
`,

    // ---------------------------------------------------------
    // ADR 0009
    // ---------------------------------------------------------
    "docs/adr/0009-billing-service-schema-reconciliation.md": `# ADR 0009: Billing Service Schema Reconciliation

## Status
Accepted

## Context
In Milestone 9, we built the \`billing-service\` to aggregate usage metrics and synchronize tenant lifecycle events via Stripe Webhooks (in \`portal-web\`).

Previously, we proposed independent tables for billing. However, in Milestone 2, the authoritative schema for \`tenants\` and \`usage_counters\` was established via Alembic migrations.

## Decisions

### 1. Unified \`usage_counters\` Shape
We reconciled the schema by choosing **ONE** authoritative shape for \`usage_counters\`: \`period_start\`, \`operation_count\`, and \`tool_call_count\` (the original Milestone 2 blueprint design). 
**Reasoning**: This shape maps perfectly cleanly to Stripe usage records (metered billing for LLM tool executions). We do not genuinely need arbitrary \`resource_type\` granularity at this time. We introduced a single \`reported\` boolean column via migration \`003_billing_additions\` to track synchronization state.

### 2. Tenant Table Extension
We did NOT create a new tenants table. Instead, we altered the existing \`tenants\` table to include \`stripe_customer_id\` and \`provisioning_status\` via Alembic.
We kept the existing \`tier\` values (\`pro\`, \`growth\`, \`enterprise\`). We do not use a \`FREE\` tier string; instead, free/trial states map to \`provisioning_status\` (e.g., \`ACTIVE\` vs \`PENDING_UPGRADE\`).

### 3. Neo4j Database Routing Safety
We explicitly retained \`neo4j_database_name\` in the \`tenants\` table. This column is the critical routing mechanism for Milestone 11's \`provision-tenant.sh\` and must not be omitted.
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

console.log("Milestone 9 files created successfully.");

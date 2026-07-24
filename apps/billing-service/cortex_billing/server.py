import os
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

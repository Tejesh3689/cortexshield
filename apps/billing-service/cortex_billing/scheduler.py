"""
cortex_billing.scheduler — Standalone billing job.

Run: uv run --package billing-service python -m cortex_billing.scheduler

Behaviour:
  • Runs one full billing cycle immediately on startup.
  • Then loops every USAGE_AGGREGATION_INTERVAL_MINUTES (default 15).
  • Each cycle:
      1. Queries unreported usage_counters rows.
      2. For tenants with stripe_customer_id, calls stripe.billing.meters.create_event.
      3. Marks those rows as reported=True.
      4. Checks monthly operation totals; writes overlimit:{tenant_id} to Redis (TTL 3600)
         for any tenant over their tier limit. proxy-engine checks this key → 402.
"""
import asyncio
import logging
import os
import time

import redis as sync_redis
import stripe
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("cortex-billing-scheduler")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_METER_EVENT_NAME = os.getenv("STRIPE_METER_EVENT_NAME", "cortexshield_operations")

# Sync DB — scheduler runs as a background script, not inside an async web server
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:localdevpassword@localhost:5432/cortexshield",
).replace("postgresql+asyncpg://", "postgresql://").replace("postgresql://neondb_owner", "postgresql://neondb_owner")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
INTERVAL_MINUTES = int(os.getenv("USAGE_AGGREGATION_INTERVAL_MINUTES", "15"))

# Tier limits (operations/month; 0 = unlimited)
TIER_LIMITS: dict[str, int] = {
    "pro": 50_000,
    "growth": 1_000_000,
    "enterprise": 0,  # unlimited
}


def get_db_engine():
    return create_engine(DATABASE_URL)


def get_redis():
    return sync_redis.from_url(REDIS_URL, decode_responses=True)


def run_billing_cycle():
    logger.info("=== Billing cycle starting ===")
    engine = get_db_engine()
    redis_client = get_redis()

    with engine.connect() as conn:
        # 1. Query unreported usage grouped by tenant
        rows = conn.execute(text("""
            SELECT uc.tenant_id,
                   SUM(uc.operation_count)      AS ops,
                   SUM(uc.tool_call_count)       AS tool_calls,
                   t.stripe_customer_id,
                   t.tier
            FROM usage_counters uc
            JOIN tenants t ON uc.tenant_id = t.id
            WHERE uc.reported = false
            GROUP BY uc.tenant_id, t.stripe_customer_id, t.tier
        """)).fetchall()

        logger.info(f"Found {len(rows)} tenants with unreported usage")

        for row in rows:
            tid = row.tenant_id
            ops = int(row.ops or 0)
            tool_calls = int(row.tool_calls or 0)
            cid = row.stripe_customer_id
            tier = (row.tier or "pro").lower()

            # 2. Push to Stripe Meters if customer ID is set
            if cid and stripe.api_key and stripe.api_key != "sk_test_placeholder":
                try:
                    stripe.billing.MeterEvent.create(
                        event_name=STRIPE_METER_EVENT_NAME,
                        payload={
                            "stripe_customer_id": cid,
                            "value": str(ops),
                        },
                        identifier=f"{tid}_{int(time.time())}",
                    )
                    logger.info(f"Stripe meter event sent: tenant={tid} ops={ops} customer={cid}")
                except Exception as e:
                    logger.error(f"Stripe push failed for tenant {tid}: {e}")
            elif not cid:
                logger.info(f"Tenant {tid}: no stripe_customer_id — skipping Stripe push")
            else:
                logger.warning(
                    f"Tenant {tid}: STRIPE_SECRET_KEY not configured — Stripe push skipped. "
                    "Set STRIPE_SECRET_KEY in billing-service/.env"
                )

            # 3. Mark as reported
            conn.execute(text("""
                UPDATE usage_counters
                SET reported = true
                WHERE tenant_id = :tid AND reported = false
            """), {"tid": tid})
            logger.info(f"Marked usage as reported for tenant={tid}")

            # 4. Check tier overage → write Redis key
            limit = TIER_LIMITS.get(tier, 50_000)
            if limit > 0 and ops >= limit:
                redis_key = f"overlimit:{tid}"
                redis_client.set(redis_key, "1", ex=3600)
                logger.warning(
                    f"OVERLIMIT: tenant={tid} tier={tier} ops={ops} limit={limit}. "
                    f"Set Redis key {redis_key} (TTL 3600s). "
                    "proxy-engine will return 402 Payment Required."
                )
            else:
                # Clear any existing overlimit flag if now under limit
                redis_client.delete(f"overlimit:{tid}")

        conn.commit()

    logger.info("=== Billing cycle complete ===")


def main():
    logger.info(f"Billing scheduler starting — interval={INTERVAL_MINUTES}m")
    while True:
        try:
            run_billing_cycle()
        except Exception as e:
            logger.error(f"Billing cycle error: {e}", exc_info=True)
        logger.info(f"Sleeping {INTERVAL_MINUTES} minutes until next cycle...")
        time.sleep(INTERVAL_MINUTES * 60)


if __name__ == "__main__":
    main()

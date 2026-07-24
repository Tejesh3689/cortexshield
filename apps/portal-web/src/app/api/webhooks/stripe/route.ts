import { NextRequest, NextResponse } from "next/server";
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

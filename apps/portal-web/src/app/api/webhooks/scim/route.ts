import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
});

export async function POST(req: NextRequest) {
  const payload = await req.json();
  // We would normally verify the WorkOS webhook signature here
  
  if (payload.event === "dsync.user.created" || payload.event === "dsync.user.updated") {
    const user = payload.data;
    const orgId = user.organization_id;
    
    try {
      const res = await pool.query("SELECT id FROM tenants WHERE workos_org_id = $1", [orgId]);
      if (res.rows.length > 0) {
        const tenantId = res.rows[0].id;
        
        // Upsert user into our local 'users' table
        await pool.query(
          "INSERT INTO users (id, tenant_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
          [user.id, tenantId]
        );
      }
    } catch (e) {
      console.error("SCIM Error:", e);
      return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
  } else if (payload.event === "dsync.user.deleted") {
    const user = payload.data;
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
    } catch (e) {
      console.error("SCIM Delete Error:", e);
    }
  }

  return NextResponse.json({ received: true });
}

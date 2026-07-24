import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const domain = email.split('@')[1];
  
  try {
    const res = await pool.query("SELECT id, tier, workos_org_id FROM tenants WHERE domain = $1", [domain]);
    
    if (res.rows.length > 0 && res.rows[0].tier === 'enterprise' && res.rows[0].workos_org_id) {
      return NextResponse.json({ 
        provider: 'workos', 
        org_id: res.rows[0].workos_org_id,
        tenant_id: res.rows[0].id
      });
    }
    
    return NextResponse.json({ provider: 'clerk' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

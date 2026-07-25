import { NextResponse } from "next/server";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_fbUdE3gYPzm6@ep-hidden-scene-aytfw8o5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

export interface TenantPolicy {
  id: string;
  tenant_id: string;
  rule_type: "restricted_tool" | "trust_threshold" | "poison_keyword";
  rule_value: any;
  enabled: boolean;
  created_at?: string;
}

const DEFAULT_SEEDED_POLICIES = [
  { rule_type: "restricted_tool", rule_value: { tool: "send_webhook" }, enabled: true },
  { rule_type: "restricted_tool", rule_value: { tool: "execute_shell_command" }, enabled: true },
  { rule_type: "restricted_tool", rule_value: { tool: "drop_database_table" }, enabled: true },
  { rule_type: "restricted_tool", rule_value: { tool: "export_pii" }, enabled: true },
  { rule_type: "trust_threshold", rule_value: { threshold: 0.3 }, enabled: true },
];

let IN_MEMORY_POLICIES: TenantPolicy[] = DEFAULT_SEEDED_POLICIES.map((p, i) => ({
  id: `policy_seed_${i + 1}`,
  tenant_id: "tenant_pro_1",
  rule_type: p.rule_type as any,
  rule_value: p.rule_value,
  enabled: p.enabled,
  created_at: new Date().toISOString(),
}));

async function getClient() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS tenant_policies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_pro_1',
      rule_type VARCHAR(64) NOT NULL,
      rule_value JSONB NOT NULL,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return { pool, client };
}

// GET /api/policies -> list active rules for current tenant
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id") || "tenant_pro_1";

  try {
    const { pool, client } = await getClient();
    const result = await client.query(
      `SELECT id, tenant_id, rule_type, rule_value, enabled, created_at 
       FROM tenant_policies 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC`,
      [tenantId]
    );

    // If empty, seed default rules into database
    if (result.rows.length === 0) {
      for (const p of DEFAULT_SEEDED_POLICIES) {
        await client.query(
          `INSERT INTO tenant_policies (tenant_id, rule_type, rule_value, enabled) 
           VALUES ($1, $2, $3, $4)`,
          [tenantId, p.rule_type, JSON.stringify(p.rule_value), p.enabled]
        );
      }
      const reFetch = await client.query(
        `SELECT id, tenant_id, rule_type, rule_value, enabled, created_at 
         FROM tenant_policies 
         WHERE tenant_id = $1 
         ORDER BY created_at DESC`,
        [tenantId]
      );
      client.release();
      await pool.end();
      return NextResponse.json({ success: true, rules: reFetch.rows, source: "postgres" });
    }

    client.release();
    await pool.end();
    return NextResponse.json({ success: true, rules: result.rows, source: "postgres" });
  } catch (err: any) {
    console.error("GET /api/policies error, falling back to memory:", err.message);
    return NextResponse.json({ success: true, rules: IN_MEMORY_POLICIES, source: "memory_fallback" });
  }
}

// POST /api/policies -> create new rule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant_id = "tenant_pro_1", rule_type, rule_value } = body;

    if (!rule_type || !rule_value) {
      return NextResponse.json({ success: false, error: "rule_type and rule_value are required" }, { status: 400 });
    }

    try {
      const { pool, client } = await getClient();
      const insertRes = await client.query(
        `INSERT INTO tenant_policies (tenant_id, rule_type, rule_value, enabled)
         VALUES ($1, $2, $3, true)
         RETURNING id, tenant_id, rule_type, rule_value, enabled, created_at`,
        [tenant_id, rule_type, typeof rule_value === "object" ? JSON.stringify(rule_value) : rule_value]
      );
      client.release();
      await pool.end();
      return NextResponse.json({ success: true, rule: insertRes.rows[0] });
    } catch (e) {
      const newMemRule: TenantPolicy = {
        id: `policy_mem_${Date.now()}`,
        tenant_id,
        rule_type,
        rule_value,
        enabled: true,
        created_at: new Date().toISOString(),
      };
      IN_MEMORY_POLICIES.unshift(newMemRule);
      return NextResponse.json({ success: true, rule: newMemRule });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/policies -> toggle rule enabled/disabled
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, enabled } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Policy ID is required" }, { status: 400 });
    }

    try {
      const { pool, client } = await getClient();
      const updateRes = await client.query(
        `UPDATE tenant_policies SET enabled = $1 WHERE id = $2 RETURNING *`,
        [enabled, id]
      );
      client.release();
      await pool.end();
      return NextResponse.json({ success: true, rule: updateRes.rows[0] });
    } catch (e) {
      IN_MEMORY_POLICIES = IN_MEMORY_POLICIES.map((p) => (p.id === id ? { ...p, enabled } : p));
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/policies -> delete rule
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Policy ID is required" }, { status: 400 });
    }

    try {
      const { pool, client } = await getClient();
      await client.query(`DELETE FROM tenant_policies WHERE id = $1`, [id]);
      client.release();
      await pool.end();
      return NextResponse.json({ success: true, deletedId: id });
    } catch (e) {
      IN_MEMORY_POLICIES = IN_MEMORY_POLICIES.filter((p) => p.id !== id);
      return NextResponse.json({ success: true, deletedId: id });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

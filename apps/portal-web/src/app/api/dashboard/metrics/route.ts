import { NextResponse } from "next/server";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_fbUdE3gYPzm6@ep-hidden-scene-aytfw8o5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant_id") || "tenant_pro_1";

  try {
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    const client = await pool.connect();

    // Auto-create usage_counters table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_counters (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL DEFAULT 'tenant_pro_1',
        period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        operation_count INT NOT NULL DEFAULT 0,
        tool_call_count INT NOT NULL DEFAULT 0,
        memory_write_count INT NOT NULL DEFAULT 0,
        firewall_deny_count INT NOT NULL DEFAULT 0,
        poison_detection_count INT NOT NULL DEFAULT 0
      );
    `);

    // 24-hour totals
    const totalsRes = await client.query(
      `
      SELECT
        COALESCE(SUM(operation_count), 0) as total_operations,
        COALESCE(SUM(tool_call_count), 0) as total_tool_calls,
        COALESCE(SUM(memory_write_count), 0) as total_memories,
        COALESCE(SUM(firewall_deny_count), 0) as total_denials,
        COALESCE(SUM(poison_detection_count), 0) as total_poison
      FROM usage_counters
      WHERE tenant_id = $1
      AND period_start > NOW() - INTERVAL '24 hours'
    `,
      [tenantId]
    );

    // Also query total audit_log_index entries to reflect live logged operations
    const auditTotals = await client.query(
      `SELECT COUNT(*) as cnt FROM audit_log_index WHERE tenant_id = $1`,
      [tenantId]
    );

    // 7-day hourly series for chart
    const seriesRes = await client.query(
      `
      SELECT 
        TO_CHAR(period_start, 'MM-DD HH24:00') as period_start, 
        operation_count, 
        firewall_deny_count, 
        poison_detection_count
      FROM usage_counters
      WHERE tenant_id = $1
      AND period_start > NOW() - INTERVAL '7 days'
      ORDER BY period_start ASC
    `,
      [tenantId]
    );

    client.release();
    await pool.end();

    const totalsRow = totalsRes.rows[0] || {};
    const auditCount = parseInt(auditTotals.rows[0]?.cnt || "0", 10);

    const totals = {
      total_operations: parseInt(totalsRow.total_operations, 10) + auditCount,
      total_tool_calls: parseInt(totalsRow.total_tool_calls, 10),
      total_memories: parseInt(totalsRow.total_memories, 10),
      total_denials: parseInt(totalsRow.total_denials, 10),
      total_poison: parseInt(totalsRow.total_poison, 10),
    };

    const series = seriesRes.rows.map((row: any) => ({
      period_start: row.period_start,
      operation_count: parseInt(row.operation_count, 10),
      firewall_deny_count: parseInt(row.firewall_deny_count, 10),
      poison_detection_count: parseInt(row.poison_detection_count, 10),
    }));

    return NextResponse.json({
      success: true,
      totals,
      series,
      isEmpty: totals.total_operations === 0 && series.length === 0,
      note: totals.total_operations === 0 && series.length === 0 ? "No activity in this period" : undefined,
    });
  } catch (err: any) {
    console.error("Dashboard metrics load error:", err);
    return NextResponse.json(
      {
        success: false,
        totals: {
          total_operations: 0,
          total_tool_calls: 0,
          total_memories: 0,
          total_denials: 0,
          total_poison: 0,
        },
        series: [],
        isEmpty: true,
        note: "No activity in this period",
      },
      { status: 200 }
    );
  }
}

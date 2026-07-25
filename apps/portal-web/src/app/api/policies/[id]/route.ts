import { NextResponse } from "next/server";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_fbUdE3gYPzm6@ep-hidden-scene-aytfw8o5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function getClient() {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  return { pool, client };
}

// PATCH /api/policies/[id] -> toggle rule enabled/disabled
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { enabled } = body;

    const { pool, client } = await getClient();
    const result = await client.query(
      `UPDATE tenant_policies SET enabled = $1 WHERE id = $2 RETURNING *`,
      [enabled, id]
    );
    client.release();
    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, message: "Rule updated locally" });
    }

    return NextResponse.json({ success: true, rule: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/policies/[id] -> delete rule
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    const { pool, client } = await getClient();
    await client.query(`DELETE FROM tenant_policies WHERE id = $1`, [id]);
    client.release();
    await pool.end();

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * portal-web API route: /api/api-keys
 *
 * GET    → list api_keys for a tenant (filtered by x-tenant-id header)
 * POST   → create a new api_key (returns the raw key ONCE — never stored plaintext)
 * DELETE → revoke an api_key by id
 *
 * Auth: expects x-api-key header; validates against api_keys table first.
 * All DB operations go to Neon Postgres via DATABASE_URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_fbUdE3gYPzm6@ep-hidden-scene-aytfw8o5.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false },
  max: 5,
});

/** SHA-256 hash an api key */
function sha256(key: string): string {
  return crypto.createHash("sha256").update(key.trim()).digest("hex");
}

/** Validate caller's api_key and return their tenant_id, or null if invalid. */
async function validateCaller(
  request: NextRequest
): Promise<{ tenantId: string; keyId: string } | null> {
  const apiKey =
    request.headers.get("x-api-key") ||
    request.headers.get("api-key") ||
    request.nextUrl.searchParams.get("api_key");

  if (!apiKey) return null;

  const keyHash = sha256(apiKey);
  const result = await pool.query(
    "SELECT id, tenant_id FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL",
    [keyHash]
  );
  if (result.rows.length === 0) return null;
  return { tenantId: result.rows[0].tenant_id, keyId: result.rows[0].id };
}

// GET /api/api-keys — list active and revoked keys for tenant
export async function GET(request: NextRequest) {
  const caller = await validateCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT
         id,
         tenant_id,
         CONCAT(SUBSTRING(key_hash, 1, 8), '...') AS key_prefix,
         created_at,
         revoked_at,
         CASE WHEN revoked_at IS NULL THEN 'Active' ELSE 'Revoked' END AS status
       FROM api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [caller.tenantId]
    );

    return NextResponse.json({
      success: true,
      tenant_id: caller.tenantId,
      api_keys: result.rows,
    });
  } catch (err) {
    console.error("GET /api/api-keys error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// POST /api/api-keys — create a new key for the tenant
export async function POST(request: NextRequest) {
  const caller = await validateCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const name = (body.name || "New Key").slice(0, 64);
  const newKeyId = crypto.randomUUID();

  // Generate a human-readable key: cs_live_<32 random hex chars>
  const rawKey = `cs_live_${crypto.randomBytes(20).toString("hex")}`;
  const keyHash = sha256(rawKey);

  try {
    await pool.query(
      "INSERT INTO api_keys (id, tenant_id, key_hash, created_at) VALUES ($1, $2, $3, NOW())",
      [newKeyId, caller.tenantId, keyHash]
    );

    // Return the raw key ONCE — it is never stored in plaintext
    return NextResponse.json({
      success: true,
      message: "Save this key — it will not be shown again.",
      api_key: {
        id: newKeyId,
        name,
        raw_key: rawKey,
        key_prefix: `${rawKey.slice(0, 12)}...`,
        created_at: new Date().toISOString(),
        status: "Active",
      },
    });
  } catch (err) {
    console.error("POST /api/api-keys error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// DELETE /api/api-keys — revoke a key by id
export async function DELETE(request: NextRequest) {
  const caller = await validateCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Prevent revoking the caller's own key (would lock them out)
  if (keyId === caller.keyId) {
    return NextResponse.json(
      { error: "Cannot revoke the key you are currently using" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      "UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL RETURNING id",
      [keyId, caller.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Key not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, revoked_id: keyId });
  } catch (err) {
    console.error("DELETE /api/api-keys error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

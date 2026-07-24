import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
// Using jose for JWT signing if we were doing it properly in production
// import { SignJWT } from 'jose';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cortex:localdevpassword@localhost:5432/cortexshield'
});

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=MissingCode", req.url));
  }

  // In reality: exchange code for profile via WorkOS API
  // const profile = await workos.sso.getProfileAndToken({ code, clientId });
  
  // MOCK Exchange for integration test purposes:
  const mockOrgId = "org_test"; // We would get this from the WorkOS profile
  
  try {
    const res = await pool.query("SELECT id FROM tenants WHERE workos_org_id = $1", [mockOrgId]);
    if (res.rows.length === 0) {
      return NextResponse.redirect(new URL("/login?error=TenantNotFound", req.url));
    }
    
    const tenantId = res.rows[0].id;
    
    // Generate a JWT signed by our internal secret that cortex_auth recognizes
    // This JWT natively maps to the TenantContext schema.
    // For local mocking without dependencies, we'll just set a dummy cookie 
    // that cortex_auth handles, but the architectural intent is a shared secret JWT.
    
    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.set("__session", `workos_token_${tenantId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/login?error=Internal", req.url));
  }
}

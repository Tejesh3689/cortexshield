import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const org_id = req.nextUrl.searchParams.get("org_id");
  const clientId = process.env.WORKOS_CLIENT_ID || "client_test_placeholder";
  const redirectUri = process.env.WORKOS_REDIRECT_URI || "http://localhost:3000/api/auth/workos/callback";
  
  if (!org_id) {
    return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
  }

  // Build the WorkOS Authorization URL
  const workosUrl = `https://api.workos.com/sso/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&organization=${org_id}`;
  
  return NextResponse.redirect(workosUrl);
}

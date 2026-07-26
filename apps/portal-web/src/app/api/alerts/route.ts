import { NextRequest, NextResponse } from "next/server";
const PROXY_ENGINE_URL = process.env.PROXY_ENGINE_URL || "http://127.0.0.1:8000";
const ACTIVE_TENANT_ID = process.env.NEXT_PUBLIC_ACTIVE_TENANT_ID || "tenant_pro_1";
const API_KEY = process.env.API_KEY || "dummy_key";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${PROXY_ENGINE_URL}/v1/alerts?tenant_id=${ACTIVE_TENANT_ID}`, {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Proxy-engine returned ${response.status}`);
      return NextResponse.json({ error: "Failed to fetch alerts" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Alerts proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const PROXY_ENGINE_URL = process.env.PROXY_ENGINE_URL || "http://localhost:8000";
    const ACTIVE_TENANT_ID = process.env.ACTIVE_TENANT_ID || "tenant_pro_1";
    const API_KEY = process.env.API_KEY || "sk_pro_123456789";
    
    const response = await fetch(`${PROXY_ENGINE_URL}/v1/agents/profiles?tenant_id=${ACTIVE_TENANT_ID}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Proxy engine returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching agent profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent profiles" },
      { status: 500 }
    );
  }
}

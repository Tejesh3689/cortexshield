import { NextRequest, NextResponse } from "next/server";
const PROXY_ENGINE_URL = process.env.PROXY_ENGINE_URL || "http://127.0.0.1:8000";
const ACTIVE_TENANT_ID = process.env.NEXT_PUBLIC_ACTIVE_TENANT_ID || "tenant_pro_1";
const API_KEY = process.env.API_KEY || "dummy_key";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const response = await fetch(`${PROXY_ENGINE_URL}/v1/alerts/${id}?tenant_id=${ACTIVE_TENANT_ID}`, {
      method: "PATCH",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Proxy-engine returned ${response.status}`);
      return NextResponse.json({ error: "Failed to update alert" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Alerts proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

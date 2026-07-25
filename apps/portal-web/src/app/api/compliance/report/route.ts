import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  // Try to get auth session, but gracefully fallback for local dev if not configured
  const session = auth();
  
  // Extract query parameters
  const { searchParams } = new URL(req.url);
  const start_date = searchParams.get("start_date") || "2026-07-01";
  const end_date = searchParams.get("end_date") || "2026-07-31";
  const format = searchParams.get("format") || "json";
  
  // For MVP, if there is a tenant_id passed, use it, else default
  const reqTenant = searchParams.get("tenant_id");
  const tenant_id = reqTenant || "tenant_pro_1";

  // Proxy the request to the proxy-engine (Python backend)
  const engineUrl = process.env.PROXY_ENGINE_URL || "http://127.0.0.1:8000";
  const targetUrl = `${engineUrl}/v1/compliance/report?tenant_id=${tenant_id}&start_date=${start_date}&end_date=${end_date}&format=${format}`;

  try {
    const backendRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "x-tenant-id": tenant_id
      }
    });

    if (!backendRes.ok) {
      const errText = await backendRes.text();
      return NextResponse.json({ success: false, error: "Backend error: " + errText }, { status: backendRes.status });
    }

    if (format === "pdf") {
      const pdfBuffer = await backendRes.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=compliance_report_${tenant_id}.pdf`
        }
      });
    }

    const jsonData = await backendRes.json();
    return NextResponse.json(jsonData);
  } catch (error: any) {
    console.error("Compliance proxy error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

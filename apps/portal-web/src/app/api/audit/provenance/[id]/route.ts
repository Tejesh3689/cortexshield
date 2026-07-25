import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    
    const response = await fetch(`${backendUrl}/v1/compliance/provenance/${id}?tenant_id=tenant_pro_1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in provenance proxy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provenance' },
      { status: 500 }
    );
  }
}

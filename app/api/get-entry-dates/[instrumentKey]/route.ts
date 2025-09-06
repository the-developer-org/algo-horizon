import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { instrumentKey: string } }
) {
  try {
    const { instrumentKey } = params;
    
    // Validate instrument key
    if (!instrumentKey || !instrumentKey.includes('NSE')) {
      return NextResponse.json(
        { error: 'Invalid Instrument Key' },
        { status: 400 }
      );
    }

    // Replace - with | for the backend call (reverse the transformation done in frontend)
    const backendInstrumentKey = instrumentKey.replace(/-/g, '|');
    
    // Get the backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    
    console.log('🗓️ Fetching entry dates from backend:', `${backendUrl}/get-entry-dates/${backendInstrumentKey}`);
    
    // Call the Spring Boot backend
    const response = await fetch(`${backendUrl}/get-entry-dates/${backendInstrumentKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Backend error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Entry dates received from backend:', data);
    
    return NextResponse.json({
      entryDates: data.entryDates || [],
      statusText: data.statusText || 'Entry Dates Fetched Successfully'
    });

  } catch (error) {
    console.error('Error fetching entry dates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

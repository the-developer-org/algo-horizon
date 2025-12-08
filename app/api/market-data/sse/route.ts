import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Connect to the actual Spring Boot backend SSE endpoint
  // Replace with your actual backend URL
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8090';
  const backendUrl = `${baseUrl.replace(/\/$/, '')}/api/socket/stream/ltp`;

  try {
    // Forward the request to the backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        // Add any authentication headers if needed
        // 'Authorization': `Bearer ${process.env.BACKEND_AUTH_TOKEN}`,
      },
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with status: ${backendResponse.status}`);
    }

    // Return the backend's SSE stream
    return new Response(backendResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error connecting to backend SSE:', error);

    // Return empty response if backend is unavailable (no fallback simulation)
    return new Response('', {
      status: 503,
      statusText: 'Backend Service Unavailable',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}
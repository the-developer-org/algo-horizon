import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  const clientId = process.env.NEXT_PUBLIC_UPSTOX_CLIENT_ID
  
  // Create detailed error logging function
  const logError = (step: string, error: any, details?: any) => {
    console.error(`❌ [UPSTOX CALLBACK ERROR] ${step}:`, error);
    if (details) console.error('Details:', details);
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(`${step}: ${error.message || error}`)}&details=${encodeURIComponent(JSON.stringify(details || {}))}`);
  };
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🚀 [UPSTOX CALLBACK] Starting callback process');
    console.log('📥 Received params:', { 
      hasCode: !!code, 
      codeLength: code?.length,
      state, 
      error,
      hasClientId: !!clientId,
      baseUrl 
    });

    if (error) {
      return logError('Authorization Error', error, { state });
    }

    if (!code) {
      return logError('Missing Code', 'No authorization code received', { searchParams: Object.fromEntries(searchParams.entries()) });
    }

    if (!clientId) {
      return logError('Configuration Error', 'Missing UPSTOX_CLIENT_ID environment variable');
    }

    // Prepare token exchange request
    const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
    if (!clientSecret) {
      return logError('Configuration Error', 'Missing UPSTOX_CLIENT_SECRET environment variable');
    }

    const redirectUri = `${baseUrl}/api/auth/callback`;
    const requestBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenUrl = `${process.env.NEXT_PUBLIC_UPSTOX_API_URL}/login/authorization/token`;
    console.log('🔄 [TOKEN EXCHANGE] Making request:', {
      url: tokenUrl,
      clientId: clientId,
      redirectUri: redirectUri,
      codePreview: code.substring(0, 6) + '***',
      hasClientSecret: !!clientSecret
    });

    // Generate Access Token
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Version': '2.0',
      },
      body: requestBody,
    });

    const responseText = await tokenResponse.text();
    console.log('📨 [TOKEN RESPONSE]:', { 
      status: tokenResponse.status, 
      statusText: tokenResponse.statusText,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 100) + '...'
    });

    if (!tokenResponse.ok) {
      return logError('Token Exchange Failed', `HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`, {
        responseBody: responseText,
        requestUrl: tokenUrl
      });
    }

    // Try to parse the response as JSON
    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse token response as JSON:', e)
      throw new Error('Invalid token response format')
    }

    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error('No access token in response:', tokenData)
      throw new Error('No access token received in response')
    }

    console.log('Successfully received access token')

    // Store token in backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    console.log('Storing token in backend:', backendUrl)

    const backendResponse = await fetch(`${backendUrl}/api/user/store-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '8885615779',
        tokenId: accessToken,
      }),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.text()
      console.error('Backend storage error:', errorData)
      throw new Error(`Failed to store token in backend: ${backendResponse.status}`)
    }

    console.log('Token successfully stored in backend')

    // Create HTML with script to store token in sessionStorage and redirect
    const html = `
      <html>
        <head>
          <title>Processing...</title>
        </head>
        <body>
          <script>
            sessionStorage.setItem('upstox_token', '${accessToken}');
            window.location.href = '${baseUrl}';
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasClientId: !!process.env.NEXT_PUBLIC_UPSTOX_CLIENT_ID,
        hasClientSecret: !!process.env.UPSTOX_CLIENT_SECRET,
        hasApiUrl: !!process.env.NEXT_PUBLIC_UPSTOX_API_URL,
        hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL,
        baseUrl: process.env.NEXT_PUBLIC_FRONTEND_URL,
      }
    };
    
    return logError('Callback Process Failed', error, errorDetails);
  }
}


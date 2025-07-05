import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL
  const clientId = process.env.NEXT_PUBLIC_UPSTOX_CLIENT_ID
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('=== DEBUG START ===')
    console.log('Received params:', { code, state })

    if (!code) {
      console.log('No code received in callback')
      return NextResponse.redirect(`${baseUrl}/auth?error=No authorization code received`)
    }

    // Log the request we're about to make
    const requestBody = new URLSearchParams({
      code,
      client_id: clientId || '',
      client_secret: process.env.UPSTOX_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/auth/callback`,
      grant_type: 'authorization_code',
    })

    console.log('Making token request with:', {
      clientId: clientId,
      redirectUri: `${baseUrl}/api/auth/callback`,
      code: code.substring(0, 10) + '...' // Only log part of the code for security
    })

    // Generate Access Token
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_UPSTOX_API_URL}/login/authorization/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Version': '2.0',
      },
      body: requestBody,
    })

    console.log('Token response status:', tokenResponse.status)
    const responseText = await tokenResponse.text()
    console.log('Token response body:', responseText)

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}\nResponse: ${responseText}`)
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
    console.error('=== ERROR DEBUG ===')
    console.error('Error details:', error)
    console.error('Environment variables:', {
      hasClientId: !!process.env.UPSTOX_CLIENT_ID,
      hasClientSecret: !!process.env.UPSTOX_CLIENT_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_FRONTEND_URL,
    })
    console.error('=== ERROR DEBUG END ===')

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(errorMessage)}`)
  }
}


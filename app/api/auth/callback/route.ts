import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect('/error?message=No authorization code received')
  }

  // Log the received code and state (for debugging purposes)
  console.log('Received authorization code:', code)
  console.log('Received state:', state)

  try {
    // Generate Access Token
    const tokenResponse = await fetch('https://api-v2.upstox.com/login/authorization/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Version': '2.0',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.UPSTOX_CLIENT_ID!,
        client_secret: process.env.UPSTOX_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_BASE_URL!,
        grant_type: 'authorization_code',
      }),
    })

    console.log(tokenResponse)

    if (!tokenResponse.ok) {
      throw new Error('Failed to retrieve access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
  
    // Log the received access token (for debugging purposes)
    console.log('Received access token:', accessToken)

    const backendResponse = await fetch('http://localhost:7070/api/user/store-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '8885615779', // Hardcoded phone number
        tokenId: accessToken, // Access token
      }),
    })

    console.log(backendResponse)

    console.log('Token stored successfully in backend')

    // In a production environment, you would typically store the access token securely
    // (e.g., in an encrypted session or a secure database)
    // For this example, we'll pass it as a query parameter (not recommended for production)
  //  return NextResponse.redirect(`/dashboard?token=${accessToken}`)
  } catch (error) {
    console.error('Error during token exchange:', error)
    return NextResponse.redirect('/error?message=Failed to authenticate with Upstox')
  }
}


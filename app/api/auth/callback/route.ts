import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/error?message=No authorization code received')
  }

  try {
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
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to retrieve access token')
    }

    const tokenData = await tokenResponse.json()

    // Here you would typically store the access token securely, e.g., in a server-side session
    // For this example, we'll pass it as a query parameter (not recommended for production)
    return NextResponse.redirect(`/dashboard?token=${tokenData.access_token}`)
  } catch (error) {
    console.error('Error during token exchange:', error)
    return NextResponse.redirect('/error?message=Failed to authenticate with Upstox')
  }
}


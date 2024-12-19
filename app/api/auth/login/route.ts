import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.UPSTOX_CLIENT_ID
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`)
  const authUrl = `https://api-v2.upstox.com/login/authorization/dialog?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`

  return NextResponse.redirect(authUrl)
}


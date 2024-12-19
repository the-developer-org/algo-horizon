import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const clientId = process.env.UPSTOX_CLIENT_ID
  const redirectUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ""
  const redirectUri =redirectUrl
  const state = crypto.randomBytes(16).toString('hex') // Generate a random state

  // In a real-world scenario, you would save this state to validate it in the callback
  // For example, you could store it in a server-side session or a secure, short-lived cache

  const authUrl = `https://api-v2.upstox.com/login/authorization/dialog?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`

  return NextResponse.redirect(authUrl)
}


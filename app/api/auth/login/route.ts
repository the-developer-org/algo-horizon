import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUpstoxConfigForUser } from '@/lib/upstox-config';

// /api/auth/login?userId=XYZ
export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 });
  }
  const cfg = getUpstoxConfigForUser({ userId: phone });

  if (!cfg) {
    return NextResponse.json({ error: 'Upstox client configuration missing for phone/group' }, { status: 500 });
  }

  // Embed userId in state so callback can associate the token to that user
  const randomPart = crypto.randomBytes(16).toString('hex');
  // Include env in state so callback can reconstruct which environment was used
  const state = `${encodeURIComponent(phone)}:${randomPart}`;

  // (Optional) Set an httpOnly cookie to later validate state integrity
  const cookieValue = crypto.createHash('sha256').update(state).digest('hex');
  debugger

  const authUrl = `https://api-v2.upstox.com/login/authorization/dialog?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(cfg?.redirectUri)}&response_type=code&state=${state}`;

  // Instead of redirecting, return the URL so client can open in new tab
  const response = NextResponse.json({ 
    authUrl,
    message: 'Open this URL in a new tab to authenticate'
  });
  response.cookies.set('upx_oauth_state', cookieValue, { httpOnly: true, path: '/', maxAge: 300 });
  return response;
}


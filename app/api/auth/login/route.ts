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
  // If per-user redirect not in env, fallback to dynamic callback path (env-aware)
  const baseFrontend = process.env.NEXT_PUBLIC_FRONTEND_URL;
  const dynamicRedirect = baseFrontend ? `${baseFrontend}/api/auth/${encodeURIComponent(phone)}/callback` : cfg?.redirectUri;
  
  if (!cfg || !dynamicRedirect) {
    return NextResponse.json({ error: 'Upstox client configuration missing for phone/group' }, { status: 500 });
  }

  // Embed userId in state so callback can associate the token to that user
  const randomPart = crypto.randomBytes(16).toString('hex');
  // Include env in state so callback can reconstruct which environment was used
  const state = `${encodeURIComponent(phone)}:${randomPart}`;

  // (Optional) Set an httpOnly cookie to later validate state integrity
  const cookieValue = crypto.createHash('sha256').update(state).digest('hex');

  const authUrl = `https://api-v2.upstox.com/login/authorization/dialog?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(dynamicRedirect)}&response_type=code&state=${state}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('upx_oauth_state', cookieValue, { httpOnly: true, path: '/', maxAge: 300 });
  return response;
}


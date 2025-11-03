import { NextRequest, NextResponse } from 'next/server';
import { getUpstoxConfigForUser } from '@/lib/upstox-config';

// Must await params per Next.js dynamic API routes guidance
export async function GET(request: NextRequest, context: { params: Promise<{ phone: string }> }) {
  const { phone } = await context.params;
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  // State format: phone:random[:env]

  console.log('[Upstox Callback] Start', { phone, hasCode: !!code, statePrefix: state?.split(':')[0] });

  if (!code) {
    console.warn('[Upstox Callback] Missing authorization code');
    return NextResponse.redirect(`${baseUrl}/auth?error=No authorization code received`);
  }

  // Validate state (basic extraction)
  if (!state || !state.startsWith(encodeURIComponent(phone))) {
    console.warn('[Upstox Callback] State validation failed', { state, expectedPrefix: encodeURIComponent(phone) });
    return NextResponse.redirect(`${baseUrl}/auth?error=Invalid state`);
  }
  
  const cfg = getUpstoxConfigForUser({ userId: phone });
  if (!cfg) {
    console.error('[Upstox Callback] No config found for phone', { phone });
    return NextResponse.redirect(`${baseUrl}/auth?error=Config not found for phone`);
  }

  console.log('[Upstox Callback] Resolved config', { 
    clientId: cfg.clientId,
    redirectUri: cfg.redirectUri,
    hasClientSecret: !!cfg.clientSecret,
    phone
  });

  try {
    const actualRedirectUri = `${baseUrl}/api/auth/${encodeURIComponent(phone)}/callback`;
    const requestBody = new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret || process.env.UPSTOX_CLIENT_SECRET || '',
      redirect_uri: actualRedirectUri,
      grant_type: 'authorization_code',
    });

    console.log('[Upstox Callback] Token request details', {
      clientId: cfg.clientId,
      redirectUri: actualRedirectUri,
      configRedirectUri: cfg.redirectUri,
      redirectMatch: actualRedirectUri === cfg.redirectUri,
      hasClientSecret: !!(cfg.clientSecret || process.env.UPSTOX_CLIENT_SECRET),
      baseUrl
    });

    // Use standard Upstox API URL for token exchange (same for both prod and sandbox)
    const apiHost = 'https://api-v2.upstox.com';
    console.log('[Upstox Callback] Exchanging code for token', { phone, apiHost, codePreview: code.substring(0, 6) + '***' });

  const tokenResp = await fetch(`${apiHost}/login/authorization/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Api-Version': '2.0' },
      body: requestBody,
    });

    const text = await tokenResp.text();
    if (!tokenResp.ok) {
      console.error('[Upstox Callback] Token exchange failed', { status: tokenResp.status, bodyPreview: text.slice(0, 120) });
      return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent('Token exchange failed')}`);
    }

    console.log('[Upstox Callback] Token exchange raw response length', text.length);

    let json: any;
    try { json = JSON.parse(text); } catch (err) {
      console.error('[Upstox Callback] JSON parse error', err);
      return NextResponse.redirect(`${baseUrl}/auth?error=Bad token JSON`);
    }

    const accessToken = json.access_token;
    if (!accessToken) {
      console.error('[Upstox Callback] No access token present in JSON keys', Object.keys(json));
      return NextResponse.redirect(`${baseUrl}/auth?error=No access token`);
    }

    console.log('[Upstox Callback] Access token received (length only)', { length: accessToken.length });

    // Store token in backend associated with phone
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    console.log('[Upstox Callback] Storing token to backend', { backendUrl, phone });
    debugger
    await fetch(`${backendUrl}/api/user/store-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, tokenId: accessToken }),
    });

    console.log('[Upstox Callback] Token stored successfully, redirecting user');

    return NextResponse.redirect(`${baseUrl}/auth/upstox-management`);
  } catch (e: any) {
    console.error('[Upstox Callback] Unexpected error', { message: e?.message, stack: e?.stack });
    return NextResponse.redirect(`${baseUrl}/auth?error=${encodeURIComponent(e.message || 'Callback error')}`);
  }
}

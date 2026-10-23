import { NextResponse } from 'next/server';

async function getAnalyticsToken() {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  if (!backend) {
    throw new Error('Backend URL is not configured');
  }

  const response = await fetch(`${backend}/api/admin/get-analytics-token`, {
    method: 'POST',
    cache: 'no-store',
  });
  const text = (await response.text()).trim().replace(/^"|"$/g, '');
  if (!response.ok || !text || /no valid token/i.test(text)) {
    throw new Error(text || 'No analytics token found');
  }
  return text;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instrumentKey = searchParams.get('instrument_key')?.trim();
  if (!instrumentKey) {
    return NextResponse.json({ statusText: 'instrument_key is required' }, { status: 400 });
  }

  let token: string;
  try {
    token = await getAnalyticsToken();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No analytics token found';
    return NextResponse.json({ statusText: message }, { status: 500 });
  }

  const url = new URL('https://api.upstox.com/v2/option/contract');
  url.searchParams.set('instrument_key', instrumentKey);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.statusText || body?.message || 'Could not load option contracts';
    return NextResponse.json({ statusText: message }, { status: response.status });
  }
  return NextResponse.json(body);
}

import { NextResponse } from 'next/server';
import { getAnalyticsToken } from '@/lib/upstoxAnalyticsToken';

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
      Authorization: token,
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

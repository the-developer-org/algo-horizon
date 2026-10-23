import { NextResponse } from 'next/server';
import { getAnalyticsToken } from '@/lib/upstoxAnalyticsToken';

type Candle = [string, number, number, number, number, number, number];

function istDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

async function upstoxCandles(token: string, url: string): Promise<Candle[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: token, 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.message || 'Could not load price';
    throw new Error(message);
  }
  const candles = body?.data?.candles;
  return Array.isArray(candles) ? candles : [];
}

function quoteFrom(candles: Candle[], source: 'intraday' | 'historical') {
  const latest = candles[0];
  const previous = candles[1] ?? latest;
  if (!latest) return null;
  return {
    price: latest[4],
    minute: latest[0],
    lastMinutePrice: previous[4],
    lastMinute: previous[0],
    lastMinuteHigh: previous[2],
    lastMinuteLow: previous[3],
    source,
  };
}

export async function GET(request: Request) {
  const instrumentKey = new URL(request.url).searchParams.get('instrument_key')?.trim();
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

  const encoded = encodeURIComponent(instrumentKey);
  try {
    const intraday = await upstoxCandles(
      token,
      `https://api.upstox.com/v3/historical-candle/intraday/${encoded}/minutes/1`,
    );
    const candles = intraday.length
      ? intraday
      : await upstoxCandles(
          token,
          `https://api.upstox.com/v3/historical-candle/${encoded}/minutes/1/${istDate()}/${istDate(-5)}`,
        );
    const quote = quoteFrom(candles, intraday.length ? 'intraday' : 'historical');
    if (!quote) {
      return NextResponse.json({ statusText: 'No traded price for this instrument' }, { status: 404 });
    }
    return NextResponse.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load price';
    return NextResponse.json({ statusText: message }, { status: 502 });
  }
}

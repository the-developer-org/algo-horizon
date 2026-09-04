import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    console.error('[ClientError]', JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to process client error', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

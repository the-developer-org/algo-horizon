import { NextResponse } from 'next/server';
import { getAnalyticsToken } from '@/lib/upstoxAnalyticsToken';

// Standard statutory FO tax and charge calculation as fallback if Upstox API token is unavailable
function calculateStandardFOCharges(
  buyAmt: number,
  sellAmt: number,
  quantity: number
) {
  // Option brokerage: standard flat ₹20 per executed order (buy + sell = ₹40)
  const brokerage = buyAmt > 0 && sellAmt > 0 ? 40 : 20;

  // STT: 0.1% on sell turnover (for options on premium turnover)
  const stt = Math.round(sellAmt * 0.001);

  // Exchange turnover charges (NSE FO Options: ~0.05% of premium turnover)
  const totalTurnover = buyAmt + sellAmt;
  const transactionCharges = Number((totalTurnover * 0.0005).toFixed(2));

  // GST: 18% on (brokerage + transactionCharges)
  const gst = Number(((brokerage + transactionCharges) * 0.18).toFixed(2));

  // Stamp duty: 0.003% on buy turnover
  const stampDuty = Math.round(buyAmt * 0.00003);

  // SEBI turnover charge: ₹10 per crore (0.0001%)
  const sebiTurnover = Number((totalTurnover * 0.000001).toFixed(2));

  // IPFT: ₹1.5 per crore
  const ipft = Number((totalTurnover * 0.00000015).toFixed(2));

  const total = Number(
    (
      brokerage +
      stt +
      transactionCharges +
      gst +
      stampDuty +
      sebiTurnover +
      ipft
    ).toFixed(2)
  );

  return {
    total,
    brokerage,
    taxes: {
      gst,
      stt,
      stamp_duty: stampDuty,
    },
    other_charges: {
      transaction: transactionCharges,
      sebi_turnover: sebiTurnover,
      ipft,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instrumentToken = searchParams.get('instrument_token')?.trim();
  const quantity = Number(searchParams.get('quantity')) || 0;
  const product = searchParams.get('product')?.trim() || 'D';
  const transactionType = searchParams.get('transaction_type')?.trim() || 'BUY';
  const price = Number(searchParams.get('price')) || 0;
  const sellPrice = Number(searchParams.get('sell_price')) || 0;

  let token = request.headers.get('authorization')?.trim() || '';
  if (!token) {
    try {
      token = await getAnalyticsToken();
    } catch {
      // Token not available; fall back to standard calculation
    }
  }

  if (token && instrumentToken && quantity > 0 && price > 0) {
    try {
      const url = new URL('https://api.upstox.com/v2/charges/brokerage');
      url.searchParams.set('instrument_token', instrumentToken);
      url.searchParams.set('quantity', String(quantity));
      url.searchParams.set('product', product);
      url.searchParams.set('transaction_type', transactionType);
      url.searchParams.set('price', String(price));

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: token,
        },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body?.data?.charges) {
        return NextResponse.json(body);
      }
    } catch (err) {
      console.warn('Upstox charges API call failed, falling back:', err);
    }
  }

  // Fallback calculation for FO options
  const buyTurnover = price * quantity;
  const sellTurnover = (sellPrice > 0 ? sellPrice : price) * quantity;
  const calculated = calculateStandardFOCharges(buyTurnover, sellTurnover, quantity);

  return NextResponse.json({
    status: 'success',
    data: {
      charges: calculated,
    },
  });
}


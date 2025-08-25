
import { NextRequest, NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

// Helper: extract URL from plain string or XML-wrapped <string>...</string>
function extractRedirectUrl(text: string): string | null {
  const trimmed = (text || '').trim();
  // plain URL?
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // XML <string> wrapper
  const m = trimmed.match(/<string[^>]*>(https?:\/\/[^<]+)<\/string>/i);
  if (m) return m[1];
  // Generic match as last resort
  const m2 = trimmed.match(/https?:\/\/[^"\s<>]+webpayments\/[^"\s<>]+/i);
  return m2 ? m2[0] : null;
}

async function createWithParams(params: { amount?: any; reference?: string; particular?: string }) {
  const amountStr = String(params.amount ?? '0');
  const amountCents = Math.round(parseFloat(amountStr) * 100);
  const ref = (params.reference || '').slice(0,50);
  const particular = (params.particular || 'Good2Go').slice(0,50);

  if (!amountCents) {
    return NextResponse.json({ ok:false, error:'missing_amount' }, { status:400 });
  }

  const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
  const formBody = buildWPRequestBody({
    username: process.env.WORLDLINE_USERNAME || '',
    password: process.env.WORLDLINE_PASSWORD || '',
    accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
    amountCents,
    type: 'purchase',
    reference: ref || 'BOOKING',
    particular,
    returnUrl: process.env.WORLDLINE_RETURN_URL || '',
    transactionSource: 'INTERNET',
  });

  const gw = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
    body: formBody,
  });
  const txt = await gw.text();
  const url = extractRedirectUrl(txt);
  if (!gw.ok || !url) {
    return NextResponse.json({ ok:false, status: gw.status, sample: txt.slice(0,400) }, { status: 502 });
  }
  return NextResponse.json({ ok:true, redirectUrl: url });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const amount = url.searchParams.get('amount') || url.searchParams.get('amt') || '0';
  const reference = url.searchParams.get('ref') || url.searchParams.get('reference') || '';
  const particular = url.searchParams.get('particular') || '';
  return createWithParams({ amount, reference, particular });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Accept legacy shapes: { amount, ref } or { amountCents, reference }
    const amount = body?.amount ?? (body?.amountCents ? Number(body.amountCents)/100 : undefined);
    const reference = body?.ref || body?.reference || '';
    const particular = body?.particular || '';
    return await createWithParams({ amount, reference, particular });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

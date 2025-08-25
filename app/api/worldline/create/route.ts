import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

function extractUrl(text: string): string | null {
  const trimmed = text.trim();
  // Case 1: plain URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Case 2: XML-wrapped <string>URL</string>
  const m = trimmed.match(/>(https?:[^<]+)</i);
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || '';
    const amountStr = url.searchParams.get('amount') || '0';
    const amountCents = Math.round(parseFloat(amountStr) * 100);

    if (!ref || !amountCents) {
      return NextResponse.json({ ok: false, error: 'missing_ref_or_amount' }, { status: 400 });
    }

    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const formBody = buildWPRequestBody({
      username: process.env.WORLDLINE_USERNAME || '',
      password: process.env.WORLDLINE_PASSWORD || '',
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      amountCents,
      type: 'purchase',
      reference: ref.slice(0,50),
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });

    const gw = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody,
    });

    const txt = await gw.text();
    const redirectUrl = extractUrl(txt);
    if (!gw.ok || !redirectUrl) {
      return NextResponse.json({ ok: false, status: gw.status, endpoint, sample: txt.slice(0, 400) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

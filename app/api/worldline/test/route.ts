import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

function extractUrl(text: string): string | null {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const m = trimmed.match(/>(https?:[^<]+)</i);
  return m ? m[1] : null;
}

export async function GET() {
  try {
    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const formBody = buildWPRequestBody({
      username: process.env.WORLDLINE_USERNAME || '',
      password: process.env.WORLDLINE_PASSWORD || '',
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      amountCents: 100,
      type: 'purchase',
      reference: 'HLTHCHK',
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody
    });
    const txt = await res.text();
    const url = extractUrl(txt);
    const ok = !!url;
    return NextResponse.json({ ok, status: res.status, sample: (url || txt.slice(0, 200)) }, { status: ok ? 200 : 502 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

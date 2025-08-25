
import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

function extract(text: string): string | null {
  const t = (text||'').trim();
  if (/^https?:\/\//i.test(t)) return t;
  const m = t.match(/<string[^>]*>(https?:\/\/[^<]+)<\/string>/i);
  if (m) return m[1];
  const m2 = t.match(/https?:\/\/[^"\s<>]+webpayments\/[^"\s<>]+/i);
  return m2 ? m2[0] : null;
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
      particular: 'Good2Go',
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody
    });
    const txt = await res.text();
    const url = extract(txt);
    return NextResponse.json({ ok: !!url, status: res.status, sample: url || txt.slice(0, 200) }, { status: url ? 200 : 502 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

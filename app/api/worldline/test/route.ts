import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

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
    const ok = /^https?:\/\//.test(txt.trim());
    return NextResponse.json({ ok, status: res.status, sample: txt.slice(0, 400) }, { status: ok ? 200 : 502 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';
export const dynamic = 'force-dynamic';

function extractUrl(raw: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const m = t.match(/<string[^>]*>(.*?)<\/string>/i);
  if (m && /^https?:\/\//i.test(m[1].trim())) return m[1].trim();
  const any = t.match(/https?:\/\/[^\s"<>]+/i);
  return any ? any[0] : null;
}

export async function GET() {
  try {
    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const body = buildWPRequestBody({
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
      body
    });
    const txt = await res.text();
    const url = extractUrl(txt);
    const ok = !!url;
    return NextResponse.json({ ok, status: res.status, sample: url || txt.slice(0,200) }, { status: ok ? 200 : 502 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'server_error' }, { status:500 });
  }
}

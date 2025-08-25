import { NextRequest, NextResponse } from 'next/server';
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

async function callGateway(amountCents: number, ref: string) {
  const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
  const body = buildWPRequestBody({
    username: process.env.WORLDLINE_USERNAME || '',
    password: process.env.WORLDLINE_PASSWORD || '',
    accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
    amountCents,
    type: 'purchase',
    reference: String(ref).slice(0,50),
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
  return { ok: !!url, status: res.status, url, sample: txt.slice(0,400) };
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const ref = u.searchParams.get('ref') || u.searchParams.get('reference') || '';
    const amtStr = u.searchParams.get('amount') || u.searchParams.get('amt') || '0';
    const cents = Math.round(parseFloat(amtStr) * 100);
    if (!ref || !cents) return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status:400 });
    const gw = await callGateway(cents, ref);
    if (!gw.ok) return NextResponse.json({ ok:false, status: gw.status, sample: gw.sample }, { status: 502 });
    const accept = (req.headers.get('accept') || '').toLowerCase();
    if (accept.includes('application/json')) {
      return NextResponse.json({ ok:true, redirectUrl: gw.url, url: gw.url, paymentUrl: gw.url });
    }
    return new Response(gw.url as string, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (e:any) { return NextResponse.json({ ok:false, error:e?.message||'server_error' }, { status:500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(()=> ({} as any));
    const ref = data.ref || data.reference || '';
    const amtAny = data.amountCents ?? data.amount ?? 0;
    const cents = typeof amtAny === 'number' ? Math.round(amtAny) : Math.round(parseFloat(String(amtAny)) * 100);
    if (!ref || !cents) return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status:400 });
    const gw = await callGateway(cents, ref);
    if (!gw.ok) return NextResponse.json({ ok:false, status: gw.status, sample: gw.sample }, { status: 502 });
    return NextResponse.json({ ok:true, redirectUrl: gw.url, url: gw.url, paymentUrl: gw.url });
  } catch (e:any) { return NextResponse.json({ ok:false, error:e?.message||'server_error' }, { status:500 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

function extractUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Case 1: already a plain URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Case 2: XML <string ...>URL</string>
  const m = trimmed.match(/<string[^>]*>(.*?)<\/string>/i);
  if (m && /^https?:\/\//i.test(m[1].trim())) return m[1].trim();
  // Case 3: any http(s) URL inside
  const any = trimmed.match(/https?:\/\/[^\s"<>]+/i);
  if (any) return any[0];
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || url.searchParams.get('reference') || '';
    const amountStr = url.searchParams.get('amount') || url.searchParams.get('amt') || '0';
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (!ref || !amountCents) return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status:400 });

    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const formBody = buildWPRequestBody({
      username: process.env.WORLDLINE_USERNAME || '',
      password: process.env.WORLDLINE_PASSWORD || '',
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      amountCents,
      type: 'purchase',
      reference: String(ref).slice(0,50),
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });

    const gw = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody,
    });
    const txt = await gw.text();
    const urlOut = extractUrl(txt);

    if (!gw.ok || !urlOut) {
      return NextResponse.json({ ok:false, status: gw.status, sample: txt.slice(0,400) }, { status: 502 });
    }

    // Content-negotiation: JSON vs text/plain
    const accept = (req.headers.get('accept') || '').toLowerCase();
    if (accept.includes('application/json')) {
      return NextResponse.json({ ok:true, redirectUrl: urlOut, url: urlOut, paymentUrl: urlOut });
    }
    return new Response(urlOut, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(()=> ({} as any));
    const ref = data.ref || data.reference || '';
    const amountStr = data.amount ?? data.amountCents ?? 0;
    const cents = typeof amountStr === 'number' ? Math.round(amountStr) : Math.round(parseFloat(String(amountStr)) * 100);
    if (!ref || !cents) return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status:400 });

    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const formBody = buildWPRequestBody({
      username: process.env.WORLDLINE_USERNAME || '',
      password: process.env.WORLDLINE_PASSWORD || '',
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      amountCents: cents,
      type: 'purchase',
      reference: String(ref).slice(0,50),
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });
    const gw = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody,
    });
    const txt = await gw.text();
    const urlOut = extractUrl(txt);

    if (!gw.ok || !urlOut) {
      return NextResponse.json({ ok:false, status: gw.status, sample: txt.slice(0,400) }, { status: 502 });
    }
    return NextResponse.json({ ok:true, redirectUrl: urlOut, url: urlOut, paymentUrl: urlOut });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

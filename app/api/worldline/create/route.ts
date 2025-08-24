// app/api/worldline/create/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function clickBase(env?: string) {
  return (env && /^prod(uction)?$/i.test(env))
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
}

export async function POST(req: Request) {
  try {
    const { ref, amount } = await req.json() as { ref?: string; amount?: number };
    if (!ref || !amount) {
      return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status: 400 });
    }

    const env = process.env.WORLDLINE_ENV || 'production';
    const base = clickBase(env);
    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

    const success = process.env.WORLDLINE_SUCCESS_URL || 'https://good2go-rth.com/success';
    const cancel  = process.env.WORLDLINE_CANCEL_URL  || 'https://good2go-rth.com/cancel';
    const error   = process.env.WORLDLINE_ERROR_URL   || 'https://good2go-rth.com/error';

    const payload = {
      amount:   { total: amount, currency: process.env.WORLDLINE_CURRENCY || 'NZD' },
      merchant: { merchantId: process.env.WORLDLINE_ACCOUNT_ID || '' },
      transaction: { reference: ref },
      urls: { success, cancel, error },
    };

    const user = process.env.WORLDLINE_USERNAME || '';
    const pass = process.env.WORLDLINE_PASSWORD || '';
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/json, application/*+json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ ok:false, stage:'worldline_create', status:r.status, endpoint, payload, response:text }, { status: 502 });
    }

    let redirectUrl = '';
    try {
      const json = JSON.parse(text);
      if (typeof json?.redirectUrl === 'string') redirectUrl = json.redirectUrl;
    } catch {}

    if (!redirectUrl) {
      const m = text.match(/https?:\/\/[^\s"']+webpayments[^\s"']+/i);
      if (m) redirectUrl = m[0];
    }

    if (!redirectUrl) {
      return NextResponse.json({ ok:false, stage:'parse_redirect', sample:text.slice(0,600) }, { status: 502 });
    }

    return NextResponse.json({ ok:true, redirectUrl });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', detail:String(e?.message || e) }, { status: 500 });
  }
}

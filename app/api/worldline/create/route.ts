import { NextResponse } from 'next/server';
import { buildWPRequestBody, worldlineBase } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || '';
    const amountStr = url.searchParams.get('amount') || '0';
    const amount = parseInt(amountStr, 10) || 0;

    if (!ref || !amount) {
      return NextResponse.json({ ok: false, error: 'missing_ref_or_amount' }, { status: 400 });
    }

    // Env
    const env = process.env.WORLDLINE_ENV || process.env.NEXT_PUBLIC_WORLDLINE_ENV || 'prod';
    const base = worldlineBase(env);
    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

    const username = process.env.WORLDLINE_USERNAME || process.env.NEXT_PUBLIC_WORLDLINE_USERNAME || '';
    const password = process.env.WORLDLINE_PASSWORD || process.env.NEXT_PUBLIC_WORLDLINE_PASSWORD || '';
    const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID || '';

    if (!username || !password || !accountId) {
      return NextResponse.json({ ok:false, error:'missing_credentials' }, { status:500 });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
    const ret = site ? `${site}/api/worldline/return?ref=${encodeURIComponent(ref)}` : `${base}/dummy`;

    const body = buildWPRequestBody({
      username, password, accountId,
      amountCents: amount,
      merchantReference: ref,
      returnUrl: ret
    });

    const gw = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const txt = await gw.text();
    // Gateway may return JSON containing redirectUrl or an XML string.
    // Try JSON first.
    let redirectUrl = '';
    try {
      const parsed = JSON.parse(txt);
      redirectUrl = parsed?.redirectUrl || parsed?.redirectURL || '';
    } catch (_e) {
      // if not JSON, attempt to extract "http(s)://...default.aspx?q=..."
      const m = txt.match(/https?:\/\/[^"\s]+webpayments\/[^"\s]+/i);
      if (m) redirectUrl = m[0];
    }

    if (!gw.ok) {
      return NextResponse.json({ ok:false, status: gw.status, endpoint, sample: txt.slice(0, 400) }, { status: 502 });
    }
    if (!redirectUrl) {
      return NextResponse.json({ ok:false, status: gw.status, endpoint, error: 'no_redirect_url', sample: txt.slice(0, 400) }, { status: 502 });
    }
    return NextResponse.json({ ok:true, redirectUrl });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

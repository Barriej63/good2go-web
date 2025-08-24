import { NextResponse } from 'next/server';
import { absFromReqOrigin } from '@/lib/url';

export const dynamic = 'force-dynamic';

function pickBase(env: string | undefined) {
  const e = (env || '').toLowerCase();
  return e === 'uat' || e === 'test'
    ? 'https://uat.paymarkclick.co.nz'
    : 'https://secure.paymarkclick.co.nz';
}

// Try to extract a redirect URL from many possible server formats
function sniffRedirectUrl(txt: string): string | null {
  // 1) direct url in JSON-like text
  const m1 = txt.match(/https?:\/\/[^"'<\s]+webpayments\/(?:default\.aspx|Default\.aspx)[^"'<\s]*/);
  if (m1) return m1[0];
  // 2) look for q= token
  const m2 = txt.match(/q=([a-f0-9]{16,64})/i);
  if (m2) {
    const base = txt.includes('uat.paymarkclick.co.nz') ?
      'https://uat.paymarkclick.co.nz' : 'https://secure.paymarkclick.co.nz';
    return `${base}/webpayments/default.aspx?q=${m2[1]}`;
  }
  // 3) XML style <redirectUrl>...</redirectUrl>
  const m3 = txt.match(/<redirectUrl>(.*?)<\/redirectUrl>/i);
  if (m3) return m3[1];
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || '';
    const amountStr = url.searchParams.get('amount') || '';
    const origin = req.headers.get('origin') || req.headers.get('x-forwarded-origin') || '';

    if (!ref || !amountStr) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const amount = parseInt(String(amountStr), 10);
    if (!Number.isFinite(amount) || amount < 50) {
      return NextResponse.json({ ok: false, error: 'bad_amount' }, { status: 400 });
    }

    const base = pickBase(process.env.WORLDLINE_ENV);
    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

    // Absolute return URLs
    const success = absFromReqOrigin(origin, process.env.NEXT_PUBLIC_WL_RETURN_SUCCESS || '/success');
    const cancel  = absFromReqOrigin(origin, process.env.NEXT_PUBLIC_WL_RETURN_CANCEL  || '/cancel');
    const error   = absFromReqOrigin(origin, process.env.NEXT_PUBLIC_WL_RETURN_ERROR   || '/error');

    const creds = {
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      username:  process.env.WORLDLINE_USERNAME   || '',
      password:  process.env.WORLDLINE_PASSWORD   || '',
    };

    // Defensive validation
    if (!creds.accountId || !creds.username || !creds.password) {
      return NextResponse.json({ ok:false, error:'missing_credentials' }, { status: 500 });
    }

    // Primary request: JSON body (common for newer WPRequest setups)
    const jsonBody = {
      accountId: creds.accountId,
      username:  creds.username,
      password:  creds.password,
      amount:    { total: amount, currency: 'NZD' },
      transaction: { reference: ref },
      urls: { success, cancel, error }
    };

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonBody)
    });

    let text = await res.text();
    if (!res.ok || !text) {
      // Fallback: form-urlencoded (some tenants require this shape)
      const form = new URLSearchParams();
      form.set('AccountId', creds.accountId);
      form.set('Username', creds.username);
      form.set('Password', creds.password);
      form.set('Amount', String(amount));
      form.set('Currency', 'NZD');
      form.set('MerchantReference', ref);
      form.set('SuccessURL', success);
      form.set('FailureURL', error);
      form.set('CancelURL', cancel);

      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      text = await res.text();
    }

    // Try parse JSON
    try {
      const j = JSON.parse(text);
      if (j?.redirectUrl) {
        return NextResponse.json({ ok:true, redirectUrl: j.redirectUrl, endpoint });
      }
    } catch {}

    // otherwise sniff any shape (XML/HTML/plain) for redirect
    const sniffed = sniffRedirectUrl(text);
    if (sniffed) {
      return NextResponse.json({ ok:true, redirectUrl: sniffed, endpoint });
    }

    // Return diagnostic (trim long body)
    const sample = text.slice(0, 800);
    return NextResponse.json({ ok:false, error:'no_redirect', endpoint, sample }, { status: 502 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}

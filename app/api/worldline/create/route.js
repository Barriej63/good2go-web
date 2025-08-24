
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

function pickEnv(k, def='') {
  return process.env[k] || process.env['NEXT_PUBLIC_' + k] || def;
}

function endpoints(env) {
  const isProd = /^(prod|production|live)$/i.test(env||'');
  const base = isProd
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
  return {
    wpRequest: base + '/api/webpayments/paymentservice/rest/WPRequest',
  };
}

function mkBody(fields) {
  const sp = new URLSearchParams();
  Object.entries(fields).forEach(([k,v]) => sp.append(k, String(v ?? '')));
  return sp.toString();
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') || '';
    const amount = url.searchParams.get('amount') || '';
    if (!ref || !amount) {
      return NextResponse.json({ ok:false, error:'missing_ref_or_amount' }, { status: 400 });
    }

    const env = pickEnv('WORLDLINE_ENV', pickEnv('NEXT_PUBLIC_WORLDLINE_ENV','uat'));
    const ep  = endpoints(env);

    const accountId = pickEnv('WORLDLINE_ACCOUNT_ID', pickEnv('NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID',''));
    const username  = pickEnv('WORLDLINE_USERNAME', pickEnv('NEXT_PUBLIC_WORLDLINE_USERNAME',''));
    const password  = pickEnv('WORLDLINE_PASSWORD', pickEnv('NEXT_PUBLIC_WORLDLINE_PASSWORD',''));
    const currency  = pickEnv('PAYMENT_CURRENCY', pickEnv('NEXT_PUBLIC_PAYMENT_CURRENCY','NZD'));

    const origin = url.origin;
    const returnUrl = origin + '/api/worldline/return';
    const notifyUrl = origin + '/api/worldline/return?notify=1';

    // If your tenant expects different keys, edit here to match.
    const fields = {
      account_id: accountId,
      username,
      password,
      amount: String(amount),
      currency,
      return_url: returnUrl,
      notification_url: notifyUrl,
      merchant_reference: ref,
    };

    const body = mkBody(fields);
    const resp = await fetch(ep.wpRequest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const ct = resp.headers.get('content-type') || '';
    const txt = await resp.text();

    if (!resp.ok) {
      return new NextResponse(
        JSON.stringify({ ok:false, stage:'worldline_create', status:resp.status, endpoint:ep.wpRequest, requestBody: fields, response: txt }),
        { status: 502, headers: { 'content-type':'application/json' } }
      );
    }

    // If Worldline replies with HTML (common), pass it straight through so browser continues flow.
    if (/text\/html/i.test(ct)) {
      return new NextResponse(txt, { status: 200, headers: { 'content-type':'text/html; charset=utf-8' } });
    }

    // Otherwise return JSON (uncommon), and let client handle redirect if they include a URL.
    return NextResponse.json({ ok:true, passthrough:true, body: txt });
  } catch (e) {
    console.error('GET /api/worldline/create error:', e);
    return NextResponse.json({ ok:false, error:'server_error' }, { status:500 });
  }
}

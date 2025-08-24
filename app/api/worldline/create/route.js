// app/api/worldline/create/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function pickBase() {
  const env = String(process.env.WORLDLINE_ENV || process.env.WORLDPAY_ENV || 'uat').toLowerCase();
  return env === 'prod' || env === 'production'
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
}
function b64(u, p) {
  return Buffer.from(`${u || ''}:${p || ''}`).toString('base64');
}
function abs(origin, pathOrUrl) {
  try { return new URL(pathOrUrl, origin).toString(); } catch { return pathOrUrl; }
}

export async function GET(req) {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref') || '';
  const amountStr = url.searchParams.get('amount') || '0';
  const amount = Number(amountStr);
  if (!ref || !amount || Number.isNaN(amount)) {
    return NextResponse.json({ ok:false, error:'missing_ref_or_amount', ref, amount: amountStr }, { status: 400 });
  }

  const base = pickBase();
  const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

  const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.WORLDPAY_ACCOUNT_ID || process.env.WORLDLINE_MERCHANT_ID || process.env.WORLDPAY_MERCHANT_ID || '';
  const username  = process.env.WORLDLINE_USERNAME   || process.env.WORLDPAY_USERNAME   || '';
  const password  = process.env.WORLDLINE_PASSWORD   || process.env.WORLDPAY_PASSWORD   || '';

  if (!username || !password || !accountId) {
    return NextResponse.json({ ok:false, error:'missing_credentials', need: {
      WORLDLINE_ACCOUNT_ID: !!process.env.WORLDLINE_ACCOUNT_ID,
      WORLDLINE_USERNAME: !!process.env.WORLDLINE_USERNAME,
      WORLDLINE_PASSWORD: !!process.env.WORLDLINE_PASSWORD
    }}, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || `${url.protocol}//${url.host}`;

  const successUrl = process.env.WORLDLINE_SUCCESS_URL || abs(origin, '/success');
  const cancelUrl  = process.env.WORLDLINE_CANCEL_URL  || abs(origin, '/cancel');
  const errorUrl   = process.env.WORLDLINE_ERROR_URL   || abs(origin, '/error');
  const notifyUrl  = abs(origin, `/api/worldline/return?ref=${encodeURIComponent(ref)}&status=notify`);

  const body = {
    accountId,
    amount: String(amount),
    currency: 'NZD',
    merchantReference: ref,
    returnUrl: successUrl,
    cancelUrl,
    errorUrl,
    notificationUrl: notifyUrl,
    merchant: { merchantId: accountId },
    transaction: { reference: ref, amount: { total: amount, currency: 'NZD' } },
    urls: { success: successUrl, cancel: cancelUrl, error: errorUrl, notification: notifyUrl }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Authorization': `Basic ${b64(username, password)}`,
    'AccountId': accountId
  };

  let resp;
  try {
    resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (e) {
    return NextResponse.json({ ok:false, stage:'network_error', message: e?.message || String(e), endpoint }, { status: 502 });
  }

  const contentType = resp.headers.get('content-type') || '';
  const status = resp.status;
  const text = await resp.text();

  if (status < 200 || status >= 300) {
    return NextResponse.json({ ok:false, stage:'wprequest_error', status, endpoint, contentType, sample: text.substring(0, 1200) }, { status: 502 });
  }

  let redirectUrl = '';
  if (contentType.includes('application/json')) {
    try {
      const data = JSON.parse(text);
      redirectUrl = data.redirectUrl || data.requestUrl || data.paymentPageUrl || data.url || '';
    } catch {}
  }
  if (!redirectUrl) {
    const m = text.match(/https?:\/\/[^\s"'<>]+\/webpayments[^\s"'<>]*/i);
    if (m) redirectUrl = m[0];
  }

  if (!redirectUrl) {
    return NextResponse.json({ ok:false, stage:'no_redirect_found', status, endpoint, contentType, sample: text.substring(0, 1200) }, { status: 502 });
  }

  return NextResponse.json({ ok:true, redirectUrl, endpointUsed: endpoint });
}

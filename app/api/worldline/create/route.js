import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function pickBase() {
  const envRaw = process.env.WORLDLINE_ENV || process.env.WORLDPAY_ENV || 'uat';
  const env = String(envRaw).toLowerCase();
  return env === 'prod' || env === 'production'
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
}
function abs(origin, pathOrUrl) { try { return new URL(pathOrUrl, origin).toString(); } catch { return pathOrUrl; } }
function b64(u, p) { return Buffer.from(`${u}:${p}`).toString('base64'); }

export async function GET(req) {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref') || '';
  const amountStr = url.searchParams.get('amount') || '';
  const amount = Number(amountStr);
  if (!ref || !amount || !Number.isFinite(amount)) {
    return NextResponse.json({ ok:false, error:'missing_ref_or_amount', ref, amountStr }, { status:400 });
  }

  const base = pickBase();
  const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN || `${url.protocol}//${url.host}`;
  const merchantId = process.env.WORLDLINE_MERCHANT_ID || process.env.WORLDPAY_MERCHANT_ID || '';
  const username   = process.env.WORLDLINE_USERNAME   || process.env.WORLDPAY_USERNAME   || '';
  const password   = process.env.WORLDLINE_PASSWORD   || process.env.WORLDPAY_PASSWORD   || '';
  if (!merchantId || !username || !password) {
    return NextResponse.json({ ok:false, error:'missing_worldline_credentials' }, { status:500 });
  }

  const returnUrl = abs(siteOrigin, `/api/worldline/return?status=return&ref=${encodeURIComponent(ref)}`);
  const cancelUrl = abs(siteOrigin, `/cancel?ref=${encodeURIComponent(ref)}`);
  const errorUrl  = abs(siteOrigin, `/error?ref=${encodeURIComponent(ref)}`);
  const notifyUrl = abs(siteOrigin, `/api/worldline/return?status=notify&ref=${encodeURIComponent(ref)}`);

  const body = {
    merchantId,
    amount: String(Math.round(amount)),
    currency: 'NZD',
    transactionReference: ref,
    returnUrl,
    cancelUrl,
    errorUrl,
    notificationUrl: notifyUrl,
    merchant: { merchantId },
    transaction: { reference: ref, amount: { total: Math.round(amount), currency: 'NZD' } },
    urls: { success: returnUrl, cancel: cancelUrl, error: errorUrl, notification: notifyUrl }
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${b64(username, password)}`,
    'Accept': 'application/json,text/html;q=0.9,*/*;q=0.8',
  };

  let resp;
  try {
    resp = await fetch(endpoint, { method:'POST', headers, body: JSON.stringify(body) });
  } catch (e) {
    return NextResponse.json({ ok:false, stage:'fetch_failed', message:String(e), endpoint }, { status:502 });
  }

  const status = resp.status;
  const contentType = resp.headers.get('content-type') || '';
  const text = await resp.text();

  if (status < 200 || status >= 300) {
    return NextResponse.json({ ok:false, stage:'worldline_create', status, endpoint, sample: text.slice(0,800) }, { status:502 });
  }

  let redirectUrl = '';
  if (contentType.includes('application/json')) {
    try {
      const data = JSON.parse(text);
      redirectUrl = data?.redirectUrl || data?.requestUrl || data?.paymentPageUrl || data?.webPaymentUrl || '';
    } catch {}
  }
  if (!redirectUrl) {
    const m = text.match(/https?:\/\/[^"'<\s]+\/webpayments[^"'<\s]*/i);
    if (m) redirectUrl = m[0];
  }
  if (!redirectUrl) {
    return NextResponse.json({ ok:false, stage:'no_redirect_in_response', status, endpoint, contentType, sample: text.slice(0,800) }, { status:502 });
  }
  return NextResponse.json({ ok:true, redirectUrl, endpointUsed: endpoint });
}


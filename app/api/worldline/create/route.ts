// app/api/worldline/create/route.js
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function abs(origin, pathOrUrl) {
  // Convert relative to absolute based on current origin
  try { return new URL(pathOrUrl, origin).toString(); } catch { return pathOrUrl; }
}

function pickPaymentUrl(j) {
  if (!j || typeof j !== 'object') return null;
  // common fields
  for (const k of ['redirectUrl','paymentUrl','url','hppUrl','webPaymentUrl']) {
    if (typeof j[k] === 'string' && j[k].startsWith('http')) return j[k];
  }
  // HAL-ish links
  if (j._links) {
    for (const key of Object.keys(j._links)) {
      const v = j._links[key];
      if (v && typeof v.href === 'string' && v.href.startsWith('http')) return v.href;
    }
  }
  return null;
}

export async function GET(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const ref = url.searchParams.get('ref') || url.searchParams.get('bid');
  let amount = url.searchParams.get('amount');

  if (!ref) {
    return NextResponse.json(
      { ok:false, error: 'missing_ref', hint: 'Call /api/worldline/create?ref=<bookingRef>&amount=6500' },
      { status: 400 }
    );
  }

  const base =
    process.env.WORLDLINE_API_BASE?.replace(/\/$/, '') ||
    (/^(prod|production|live)$/i.test(process.env.WORLDLINE_ENV || '') ? 'https://secure.paymarkclick.co.nz' : 'https://uat.paymarkclick.co.nz');

  const endpoint = `${base}/api/payment`;

  const accountId = process.env.WORLDPAY_ACCOUNT_ID || '';
  const user = process.env.WORLDPAY_USERNAME || '';
  const pass = process.env.WORLDPAY_PASSWORD || '';
  const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

  // Absolute return URLs (env overrides allowed)
  const successUrl = abs(origin, process.env.WORLDLINE_SUCCESS_URL || `/api/worldline/return?bid=${encodeURIComponent(ref)}`);
  const cancelUrl  = abs(origin, process.env.WORLDLINE_CANCEL_URL  || `/api/worldline/return?bid=${encodeURIComponent(ref)}&cancel=1`);
  const errorUrl   = abs(origin, process.env.WORLDLINE_ERROR_URL   || `/api/worldline/return?bid=${encodeURIComponent(ref)}&error=1`);

  // If amount not passed, try to read from booking doc
  if (!amount) {
    try {
      const db = getAdminDb();
      const snap = await db.collection('bookings').doc(ref).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.amountCents != null) amount = String(data.amountCents);
      }
    } catch (e) {
      // continue; we'll validate below
    }
  }

  const amountCents = parseInt(String(amount || ''), 10);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    const msg = 'missing_or_invalid_amount';
    if (process.env.DEBUG_HPP === '1') {
      return NextResponse.json({ ok:false, error: msg, ref, hint: 'Provide amount=6500 (baseline) or 19900 (package)' }, { status: 400 });
    }
    // graceful fallback
    return NextResponse.redirect(abs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);
  }

  const body = {
    amount: { total: amountCents, currency: 'NZD' },
    merchant: { merchantId: accountId },
    transaction: { reference: ref },
    urls: { success: successUrl, cancel: cancelUrl, error: errorUrl }
  };

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify(body)
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!r.ok) {
      if (process.env.DEBUG_HPP === '1') {
        return NextResponse.json({
          ok:false, stage:'worldline_create', status:r.status, endpoint, requestBody: body, response:text
        }, { status: r.status || 500 });
      }
      return NextResponse.redirect(abs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);
    }

    const payUrl = pickPaymentUrl(json);
    if (payUrl) {
      return NextResponse.redirect(payUrl, 302);
    }

    // No link found
    if (process.env.DEBUG_HPP === '1') {
      return NextResponse.json({
        ok:false, stage:'no_link_found', endpoint, requestBody: body, response: json ?? text
      }, { status: 502 });
    }
    return NextResponse.redirect(abs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);

  } catch (e) {
    if (process.env.DEBUG_HPP === '1') {
      return NextResponse.json({ ok:false, stage:'exception', message: String(e) }, { status: 500 });
    }
    return NextResponse.redirect(abs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);
  }
}

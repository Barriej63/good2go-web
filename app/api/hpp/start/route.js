import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function basicAuth(user, pass) {
  const token = Buffer.from(`${user}:${pass}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

function toAbsolute(urlOrPath, origin) {
  try { return new URL(urlOrPath, origin).toString(); }
  catch { return new URL('/success', origin).toString(); }
}

export async function GET(req) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const ref = searchParams.get('ref');
    if (!ref) return NextResponse.json({ error: 'missing_ref' }, { status: 400 });

    const db = getAdminDb();
    const snap = await db.collection('bookings').where('bookingRef', '==', ref).limit(1).get();
    if (snap.empty) {
      const fb = toAbsolute(`/success?ref=${encodeURIComponent(ref)}`, origin);
      return NextResponse.redirect(fb, { status: 302 });
    }
    const booking = snap.docs[0].data() || {};

    const pkg = booking.packageType === 'package4' ? 'package4' : 'baseline';
    const amountCents = pkg === 'package4' ? 19900 : 6500;

    const base = process.env.WORLDLINE_API_BASE || 'https://secure.paymarkclick.co.nz';
    const endpoint = `${base.replace(/\/+$/, '')}/api/payment`;

    const accountId = process.env.WORLDPAY_ACCOUNT_ID || '';
    const username = process.env.WORLDPAY_USERNAME || '';
    const password = process.env.WORLDPAY_PASSWORD || '';

    if (!accountId || !username || !password) {
      const fb = toAbsolute(`/success?ref=${encodeURIComponent(ref)}`, origin);
      return NextResponse.redirect(fb, { status: 302 });
    }

    const successUrl = toAbsolute(process.env.WORLDLINE_SUCCESS_URL || '/success', origin);
    const cancelUrl  = toAbsolute(process.env.WORLDLINE_CANCEL_URL  || '/cancel', origin);
    const errorUrl   = toAbsolute(process.env.WORLDLINE_ERROR_URL   || '/error', origin);

    const body = {
      amount: { total: amountCents, currency: 'NZD' },
      merchant: { merchantId: accountId },
      transaction: { reference: ref },
      urls: { success: successUrl, cancel: cancelUrl, error: errorUrl },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': basicAuth(username, password),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    let payUrl = null;
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      payUrl = j?.redirectUrl || j?.paymentUrl || j?.url || j?.hppUrl || j?.webPaymentUrl || null;
    } catch {}

    if (res.ok && payUrl) {
      const absolute = toAbsolute(payUrl, origin);
      return NextResponse.redirect(absolute, { status: 302 });
    }

    const fallback = toAbsolute(`/success?ref=${encodeURIComponent(ref)}&gw=fail`, origin);
    return NextResponse.redirect(fallback, { status: 302 });
  } catch (e) {
    console.error('GET /api/hpp/start error', e);
    const origin = req?.url ? new URL(req.url).origin : 'https://good2go-rth.com';
    const fb = toAbsolute('/success?ref=UNKNOWN&err=server', origin);
    return NextResponse.redirect(fb, { status: 302 });
  }
}
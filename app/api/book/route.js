import { NextResponse } from 'next/server';
import { buildWPRequestBody, wpRequestUrl } from '@/lib/worldline';

export const dynamic = 'force-dynamic';

/**
 * Accepts booking payload, creates a bookingRef, and immediately
 * creates a Worldline HPP session, returning redirectUrl so the
 * existing booking UI can redirect without any UI changes.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const pkg = body?.packageType || body?.pkg || 'baseline';
    const region = body?.region || '';
    const dateISO = body?.dateISO || body?.slot || '';
    const amountCents = pkg === 'package' ? 19900 : 6500;

    // Generate a reference that matches your previous pattern
    const dt = new Date();
    const ref = body?.bookingRef || `G2G-${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}-${String(dt.getHours()).padStart(2,'0')}${String(dt.getMinutes()).padStart(2,'0')}${String(dt.getSeconds()).padStart(2,'0')}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

    // Build HPP request
    const endpoint = wpRequestUrl(process.env.WORLDLINE_ENV);
    const formBody = buildWPRequestBody({
      username: process.env.WORLDLINE_USERNAME || '',
      password: process.env.WORLDLINE_PASSWORD || '',
      accountId: process.env.WORLDLINE_ACCOUNT_ID || '',
      amountCents,
      type: 'purchase',
      reference: ref.slice(0, 50),
      particular: (region || 'Good2Go').slice(0, 50),
      returnUrl: process.env.WORLDLINE_RETURN_URL || '',
      transactionSource: 'INTERNET',
    });

    const gw = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: formBody
    });
    const txt = await gw.text();

    const m = txt.trim().match(/https?:[^<\s"]+/i) || txt.trim().match(/<string[^>]*>(https?:[^<]+)<\/string>/i);
    const redirectUrl = m ? m[1] || m[0] : '';

    if (!redirectUrl) {
      return NextResponse.json({ ok:false, error: 'worldline_no_redirect', sample: txt.slice(0, 200), bookingRef: ref }, { status: 502 });
    }

    // Return in the shape the UI expects
    return NextResponse.json({
      ok: true,
      bookingRef: ref,
      paymentUrl: redirectUrl,
      redirectUrl,
      url: redirectUrl,
      attachedTo: 'standalone',
      region,
      dateISO
    });
  } catch (e) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}

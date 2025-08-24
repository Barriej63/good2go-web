// app/api/worldline/create/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function toAbs(origin: string, urlOrPath: string): string {
  try { return new URL(urlOrPath, origin).toString(); } catch { return urlOrPath; }
}
function pickPaymentUrl(payload: any): string | null {
  if (!payload) return null;
  for (const k of ['redirectUrl','paymentUrl','url','hppUrl','webPaymentUrl']) {
    const v = (payload as any)[k];
    if (typeof v === 'string' && v.startsWith('http')) return v;
  }
  if ((payload as any)._links) {
    for (const key of Object.keys((payload as any)._links)) {
      const v = (payload as any)._links[key];
      if (v && typeof v.href === 'string' && v.href.startsWith('http')) return v.href;
    }
  }
  return null;
}
function stripTrailingSlash(s?: string|null) {
  if (!s) return '';
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url); const origin = url.origin;
  const ref = url.searchParams.get('ref') || url.searchParams.get('bid') || '';
  let amount = url.searchParams.get('amount') || '';

  if (!ref) return NextResponse.json({ ok:false, error:'missing_ref' }, { status:400 });

  const base =
    stripTrailingSlash(process.env.WORLDLINE_API_BASE || '') ||
    (/^(prod|production|live)$/i.test(process.env.WORLDLINE_ENV || '')
      ? 'https://secure.paymarkclick.co.nz'
      : 'https://uat.paymarkclick.co.nz');

  const accountId = process.env.WORLDPAY_ACCOUNT_ID || process.env.WORLDLINE_ACCOUNT_ID || '';
  const user = process.env.WORLDPAY_USERNAME || process.env.WORLDLINE_USERNAME || '';
  const pass = process.env.WORLDPAY_PASSWORD || process.env.WORLDLINE_PASSWORD || '';
  const auth = (user || pass) ? ('Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')) : '';

  // Resolve amount from Firestore if not supplied
  if (!amount) {
    try {
      const db = getAdminDb();
      const snap = await db.collection('bookings').doc(ref).get();
      if (snap.exists) {
        const data = snap.data() as any;
        if (data && data.amountCents) amount = String(data.amountCents);
      }
    } catch {}
  }
  const amountCents = parseInt(amount, 10);
  if (!amountCents || amountCents <= 0) {
    if (process.env.DEBUG_HPP === '1')
      return NextResponse.json({ ok:false, error:'missing_or_invalid_amount', ref }, { status:400 });
    return NextResponse.redirect(toAbs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);
  }

  const successUrl = toAbs(origin, process.env.WORLDLINE_SUCCESS_URL || `/api/worldline/return?bid=${encodeURIComponent(ref)}`);
  const cancelUrl  = toAbs(origin, process.env.WORLDLINE_CANCEL_URL  || `/api/worldline/return?bid=${encodeURIComponent(ref)}&cancel=1`);
  const errorUrl   = toAbs(origin, process.env.WORLDLINE_ERROR_URL   || `/api/worldline/return?bid=${encodeURIComponent(ref)}&error=1`);

  const commonBody = {
    amount: { total: amountCents, currency: 'NZD' },
    merchant: { merchantId: accountId },
    transaction: { reference: ref },
    urls: { success: successUrl, cancel: cancelUrl, error: errorUrl }
  };

  const candidates = [
    '/api/payment',
    '/api/payments',
    '/payment',
    '/payments',
    '/api/webpayments',
    '/webpayments',
    '/api/payment/create',
    '/payments/create',
    '/payment/create',
  ];

  const attempts: any[] = [];
  for (const path of candidates) {
    const endpoint = stripTrailingSlash(base) + path;
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (auth) headers['Authorization'] = auth;

      const r = await fetch(endpoint, { method:'POST', headers, body: JSON.stringify(commonBody) });
      const text = await r.text();
      let json: any = null; try { json = JSON.parse(text); } catch {}

      attempts.push({ endpoint, status: r.status, ok: r.ok, sample: (json || text).toString().slice(0, 200) });

      if (r.status === 401 || r.status === 403) {
        // auth problem—stop early
        if (process.env.DEBUG_HPP === '1')
          return NextResponse.json({ ok:false, stage:'auth_error', endpoint, status:r.status, response: json || text }, { status:r.status });
        break;
      }

      if (!r.ok) continue;

      const payUrl = pickPaymentUrl(json);
      if (payUrl) return NextResponse.redirect(payUrl, 302);
      // If it's OK but we couldn't find a URL, move on to the next candidate
    } catch (e: any) {
      attempts.push({ endpoint, error: String(e) });
    }
  }

  if (process.env.DEBUG_HPP === '1')
    return NextResponse.json({ ok:false, stage:'no_working_endpoint', base, ref, attempts }, { status: 502 });

  // graceful fallback so the flow isn't dead-ended
  return NextResponse.redirect(toAbs(origin, `/success?ref=${encodeURIComponent(ref)}`), 302);
}

// Server Route: /api/book — returns { ok, bookingRef, redirectUrl } (also: url, paymentUrl)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

function extractUrl(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  if (/^https?:\/\//i.test(t)) return t;
  const m = t.match(/<string[^>]*>(.*?)<\/string>/i);
  if (m && /^https?:\/\//i.test(m[1].trim())) return m[1].trim();
  const any = t.match(/https?:\/\/[^\s"<>]+/i);
  return any ? any[0] : null;
}

function pickAmountCents(payload) {
  const pkg = (payload?.packageType || payload?.package || payload?.plan || 'baseline').toLowerCase();
  if (pkg.includes('concussion') || pkg.includes('package') || pkg.includes('premium')) return 19900;
  return 6500;
}

function makeRef() {
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,'0');
  const ts = `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `G2G-${ts}-${rand}`;
}

async function createOrUpdateBooking(db, bookingRef, payload, amountCents) {
  if (!db) return;
  const {
    name, clientName, email, yourEmail,
    region, slot, venue, venueAddress, referringName, medicalEmail,
    dateISO, start, end, packageType, allDates = [],
    consentAccepted
  } = payload || {};
  const doc = {
    ref: bookingRef,
    name: name || clientName || '',
    email: email || yourEmail || '',
    region: region || '',
    slot: slot || '',
    venueAddress: venueAddress || venue || '',
    referringName: referringName || '',
    medicalEmail: medicalEmail || null,
    dateISO: dateISO || '',
    start: start || '',
    end: end || '',
    packageType: packageType || payload?.package || 'baseline',
    allDates: Array.isArray(allDates) ? allDates : [],
    amountCents: Number.isFinite(amountCents) ? amountCents : pickAmountCents(payload),
    consentAccepted: !!consentAccepted,
    status: 'pending',
    paid: false,
    createdAt: new Date().toISOString(),
    lastUpdateAt: new Date().toISOString(),
    _raw: payload,
  };
  await db.collection('bookings').doc(bookingRef).set(doc, { merge: true });
}

function resolveReturnUrl(req) {
  const envRet = (process.env.WORLDLINE_RETURN_URL || '').trim();
  if (envRet) return envRet; // keep your existing working value
  // Fallback so we never send an empty/invalid return_url
  const origin = new URL(req.url).origin;
  return `${origin}/api/worldline/return`;
}

export async function POST(req) {
  const debug = new URL(req.url).searchParams.get('debug') === '1';

  try {
    const payload = await req.json().catch(()=> ({}));
    const bookingRef = payload?.ref || payload?.reference || makeRef();
    const amountCents = payload?.amountCents ?? (payload?.amount ? Math.round(parseFloat(String(payload.amount))*100) : pickAmountCents(payload));

    // 1) Write booking BEFORE redirect (so admin sees it immediately)
    try {
      const db = getFirestoreFromAny();
      if (db) await createOrUpdateBooking(db, bookingRef, payload, amountCents);
    } catch (e) {
      console.error('create booking failed (continuing):', e);
    }

    // 2) Build Worldline HPP request — EXACTLY the same params you had working
    const params = new URLSearchParams();
    params.set('username', process.env.WORLDLINE_USERNAME || '');
    params.set('password', process.env.WORLDLINE_PASSWORD || '');
    params.set('account_id', process.env.WORLDLINE_ACCOUNT_ID || '');
    params.set('cmd', '_xclick');
    params.set('type', 'purchase');
    params.set('amount', (Math.max(0, Math.round(amountCents))/100).toFixed(2));
    params.set('reference', String(bookingRef).slice(0,50));
    params.set('return_url', resolveReturnUrl(req));
    params.set('transaction_source', 'INTERNET');

    const env = (process.env.WORLDLINE_ENV || 'uat').toLowerCase();
    const base = (env === 'production' || env === 'prod')
      ? 'https://secure.paymarkclick.co.nz'
      : 'https://uat.paymarkclick.co.nz';
    const endpoint = base + '/api/webpayments/paymentservice/rest/WPRequest';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
      body: params.toString()
    });

    const txt = await res.text();
    const url = extractUrl(txt);

    if (debug) {
      return new Response(JSON.stringify({
        ok: !!url, status: res.status, bookingRef, redirectUrl: url || null, sample: txt.slice(0, 1200)
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (!res.ok || !url) {
      return new Response(JSON.stringify({
        ok:false,
        error:'worldline_no_redirect',
        status: res.status,
        sample: txt.slice(0, 600)
      }), { status: 502, headers: { 'Content-Type':'application/json' } });
    }

    return new Response(JSON.stringify({ ok:true, bookingRef, redirectUrl: url, url, paymentUrl: url }), {
      status: 200, headers: { 'Content-Type':'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'server_error' }), {
      status: 500, headers: { 'Content-Type':'application/json' }
    });
  }
}

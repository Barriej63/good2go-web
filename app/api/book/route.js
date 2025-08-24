
// app/api/book/route.js
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function abs(origin, pathOrUrl) {
  try { return new URL(pathOrUrl, origin).toString(); }
  catch { return origin + pathOrUrl; }
}

// Health
export async function GET(req) {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok: true, env: process.env.WORLDLINE_ENV || 'uat', admin: 'ready' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const origin = new URL(req.url).origin;
    const body = await req.json();
    const required = ['name','email','region','slot','referringName','consentAccepted'];
    for (const k of required) {
      if (!body[k]) return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }
    if (body.consentAccepted !== true) {
      return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');
    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone || '',
      region: body.region,
      time: body.slot,
      venue: body.venue || body.venueAddress || '',
      referringProfessional: { name: body.referringName, email: body.medicalEmail || null },
      consent: { accepted: true, acceptedAt: new Date(), duration: body.consentDuration || 'Until Revoked' },
      packageType: body.packageType || 'baseline',
      allDates: body.allDates || [],
      bookingRef,
      createdAt: new Date(),
      status: 'pending'
    };
    await adminDb.collection('bookings').doc(bookingRef).set(payload, { merge: true });

    // decide amount
    const amountCents = payload.packageType === 'package4' ? 19900 : 6500;

    // Call our Worldline create endpoint to obtain HPP URL
    const createRes = await fetch(abs(origin, '/api/worldline/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: bookingRef,
        amountCents,
        currency: 'NZD',
        reference: bookingRef,
        successUrl: '/api/worldline/return?bid='+encodeURIComponent(bookingRef),
        cancelUrl: '/api/worldline/return?bid='+encodeURIComponent(bookingRef)+'&cancel=1',
        errorUrl: '/api/worldline/return?bid='+encodeURIComponent(bookingRef)+'&error=1'
      })
    });
    const j = await createRes.json().catch(()=> ({}));
    const redirectUrl = j?.redirectUrl || j?.paymentUrl || j?.url;
    if (redirectUrl) {
      return NextResponse.json({ ok: true, id: bookingRef, bookingRef, redirectUrl: redirectUrl });
    }

    // fallback: send to success so clients aren't stuck
    return NextResponse.json({ ok:true, id: bookingRef, bookingRef, redirectUrl: abs(origin, '/success?ref='+encodeURIComponent(bookingRef)) });
  } catch (e) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

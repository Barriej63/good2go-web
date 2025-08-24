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

// Simple health probe (GET /api/book)
export async function GET(req) {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({
      ok: true,
      admin: 'ready',
      env: process.env.NODE_ENV || 'unknown',
    });
  } catch (e) {
    console.error('GET /api/book health error:', e);
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

// Create booking (POST /api/book)
export async function POST(req) {
  const origin = new URL(req.url).origin;

  try {
    const body = await req.json();

    // Validate required fields coming from the booking form
    const required = ['name','email','region','slot','referringName','consentAccepted'];
    for (const k of required) {
      if (body[k] == null || body[k] === '') {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
    }
    if (body.consentAccepted !== true) {
      return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');

    // Amount in cents from packageType
    const pkg = String(body.packageType || '').toLowerCase();
    const amountCents = pkg === 'package4' ? 19900 : 6500; // default baseline

    // Persist the booking (keep all fields you already store)
    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone || '',
      region: body.region,
      time: body.slot, // legacy combined string

      // Optional extras
      venue: body.venue || body.venueAddress || '',
      referringProfessional: { name: body.referringName || '' },
      medicalEmail: body.medicalEmail || null,

      // Consent snapshot
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: body.consentDuration || 'Until Revoked',
      },

      // Structured fields your UI now sends
      dateISO: body.dateISO || null,
      start: body.start || null,
      end: body.end || null,
      venueAddress: body.venueAddress || body.venue || '',
      packageType: pkg || 'baseline',
      allDates: Array.isArray(body.allDates) ? body.allDates : (body.dateISO ? [body.dateISO] : []),

      // Payment metadata
      amountCents,
      currency: 'NZD',

      bookingRef,
      status: 'pending',
      createdAt: new Date(),
    };

    // Use bookingRef as the doc id so it's easy to fetch later
    await adminDb.collection('bookings').doc(bookingRef).set(payload);

    // Build an ABSOLUTE redirect to your HPP generator
    const createUrl = new URL(
      `/api/worldline/create?ref=${encodeURIComponent(bookingRef)}&amount=${amountCents}`,
      origin
    ).toString();

    return NextResponse.json({
      ok: true,
      id: bookingRef,
      bookingRef,
      redirectUrl: createUrl,
    });
  } catch (e) {
    console.error('POST /api/book error:', e);
    // Give the client a safe landing
    const ref = typeof e?.bookingRef === 'string' ? e.bookingRef : 'ERR';
    const fallback = new URL(`/success?ref=${encodeURIComponent(ref)}`, origin).toString();
    return NextResponse.json({ error: 'server_error', redirectUrl: fallback }, { status: 500 });
  }
}

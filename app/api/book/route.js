import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function GET() {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok: true, env: process.env.NODE_ENV || 'staging', admin: 'ready' });
  } catch (e) {
    console.error('GET /api/book health error:', e);
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Minimal required
    const required = ['name','email','region','slot','venue','consentAccepted'];
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
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
      time: body.slot, // legacy combined slot string
      dateISO: body.dateISO || null,
      start: body.start || null,
      end: body.end || null,
      venue: body.venue,
      venueAddress: body.venueAddress || body.venue || '',
      medicalEmail: body.medicalEmail || null,
      referringProfessional: { name: body.referringName || '', email: body.medicalEmail || null },
      consent: { accepted: true, acceptedAt: new Date(), duration: body.consentDuration || 'Until Revoked' },
      bookingRef,
      createdAt: new Date(),
    };

    const doc = await adminDb.collection('bookings').add(payload);

    // Build redirect URL using internal HPP start endpoint
    const base = process.env.INTERNAL_HPP_START_URL; // e.g. '/api/hpp/start'
    const redirectUrl = base ? `${base}?ref=${encodeURIComponent(bookingRef)}` : null;

    return NextResponse.json({ ok: true, id: doc.id, bookingRef, redirectUrl });
  } catch (e) {
    console.error('POST /api/book error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

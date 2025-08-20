// app/api/book/route.js
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';

// Ensure this route is always executed at request time (not statically optimized)
export const dynamic = 'force-dynamic';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

// Simple health probe: lets us confirm the server can boot Admin SDK
export async function GET() {
  try {
    const db = getAdminDb();
    // do a very light call that doesn't write
    await db.listCollections(); // succeeds if credentials are valid
    return NextResponse.json({ ok: true, env: 'staging', admin: 'ready' });
  } catch (e) {
    console.error('GET /api/book health error:', e);
    return NextResponse.json(
      { ok: false, error: 'admin_init_failed' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const required = ['name','email','region','slot','venue','referringName','consentAccepted'];
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
      time: body.slot,
      venue: body.venue,
      referringProfessional: { name: body.referringName },
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: body.consentDuration || 'Until Revoked',
      },
      bookingRef,
      createdAt: new Date(),
    };

    const doc = await adminDb.collection('bookings').add(payload);
    return NextResponse.json({ ok: true, id: doc.id, bookingRef });
  } catch (e) {
    console.error('POST /api/book error:', e);
    // Return a compact error string so we can see it in the client/network panel
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}

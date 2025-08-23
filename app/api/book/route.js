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

// Health probe
export async function GET() {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok: true, env: process.env.NODE_ENV || 'production', admin: 'ready' });
  } catch (e) {
    console.error('GET /api/book health error:', e);
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Accept both legacy and new payloads
    const name = body.name || body.clientName;
    const email = body.email;
    const region = body.region;
    const slot = body.slot; // legacy combined string
    const consentAccepted = body.consentAccepted === true;

    // New structured fields (optional)
    const dateISO = body.dateISO || null;
    const start = body.start || null;
    const end = body.end || null;
    const venueAddress = body.venueAddress || body.venue || '';
    const medicalEmail = body.medicalEmail || null;
    const referringName = body.referringName || '';

    if (!name || !email || !region || !(slot || (dateISO && start && end)) ) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }
    if (!consentAccepted) {
      return NextResponse.json({ error: 'Consent is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');

    const payload = {
      clientName: name,
      email,
      region,
      time: slot || `${dateISO} ${start}-${end}`,
      venue: venueAddress,
      medicalEmail: medicalEmail || undefined,
      referringProfessional: referringName ? { name: referringName } : undefined,
      consent: { accepted: true, acceptedAt: new Date(), duration: body.consentDuration || 'Until Revoked' },
      bookingRef,
      // normalized fields for success/receipt
      dateISO, start, end, venueAddress,
      createdAt: new Date(),
    };

    const doc = await adminDb.collection('bookings').add(payload);

    // If your environment already has an HPP start URL configured, use it
    const hppDirect = process.env.NEXT_PUBLIC_HPP_DIRECT_URL; // e.g., set to your /api/hpp/start endpoint with query
    if (hppDirect) {
      const redirectUrl = `${hppDirect}${hppDirect.includes('?') ? '&' : '?'}ref=${encodeURIComponent(bookingRef)}`;
      return NextResponse.json({ ok: true, id: doc.id, bookingRef, redirectUrl });
    }

    // Otherwise return bookingRef and let the client fall back to /success while we wire HPP
    return NextResponse.json({ ok: true, id: doc.id, bookingRef });
  } catch (e) {
    console.error('POST /api/book error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

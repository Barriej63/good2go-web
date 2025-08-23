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

// HEALTH: confirm admin boots
export async function GET() {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok: true, env: 'staging', admin: 'ready' });
  } catch (e) {
    console.error('GET /api/book health error:', e);
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Minimal set; keep compatibility with your existing payload
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

    // Persist richer details so /success can show them
    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone || '',
      region: body.region,
      time: body.slot, // legacy
      dateISO: body.dateISO || null,
      start: body.start || null,
      end: body.end || null,
      venue: body.venue,
      venueAddress: body.venueAddress || body.venue || '',
      medicalEmail: body.medicalEmail || null,
      packageType: body.packageType || 'baseline',
      allDates: Array.isArray(body.allDates) ? body.allDates : (body.dateISO ? [body.dateISO] : []),
      referringProfessional: {
        name: body.referringName || '',
        email: body.medicalEmail || null,
      },
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: body.consentDuration || 'Until Revoked',
      },
      bookingRef,
      createdAt: new Date(),
    };

    const doc = await adminDb.collection('bookings').add(payload);

    // Build redirect target
    // Preferred: internal route that 302's to Worldline (set INTERNAL_HPP_START_URL=/api/hpp/start)
    const base = process.env.INTERNAL_HPP_START_URL || '';
    let redirectUrl = null;
    if (base) {
      const sep = base.includes('?') ? '&' : '?';
      redirectUrl = `${base}${sep}ref=${encodeURIComponent(bookingRef)}`;
    }

    // As a safety net, allow direct override (rare)
    if (!redirectUrl && process.env.WORLDLINE_HPP_URL) {
      // This is usually a constant HPP start page that accepts a reference param; we append ref if it looks like it can take one
      const wl = process.env.WORLDLINE_HPP_URL;
      const sep = wl.includes('?') ? '&' : '?';
      redirectUrl = `${wl}${sep}ref=${encodeURIComponent(bookingRef)}`;
    }

    // Last-resort fallback to success so the flow doesn't dead-end
    if (!redirectUrl) {
      redirectUrl = `/success?ref=${encodeURIComponent(bookingRef)}`;
    }

    return NextResponse.json({ ok: true, id: doc.id, bookingRef, redirectUrl });
  } catch (e) {
    console.error('POST /api/book error:', e);
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}

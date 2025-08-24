import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin.js';

export const dynamic = 'force-dynamic';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // RELAXED required fields so you don't get 400s while iterating
    const fields = {
      name: body.name || body.clientName || '',
      email: body.email || '',
      region: body.region || '',
      slot: body.slot || '',
      venue: body.venue || '',
      referringName: body.referringName || '',
      referringEmail: body.referringEmail || '',
      consentAccepted: body.consentAccepted === true,
      product: body.product || 'baseline', // 'baseline' | 'package'
      isPackage: body.isPackage === true,
    };

    if (!fields.name || !fields.email || !fields.region || !fields.slot || !fields.consentAccepted) {
      return NextResponse.json({
        ok: false,
        error: 'missing_required_fields',
        detail: {
          name: !!fields.name, email: !!fields.email, region: !!fields.region, slot: !!fields.slot, consentAccepted: !!fields.consentAccepted
        }
      }, { status: 400 });
    }

    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');

    const payload = {
      bookingRef,
      clientName: fields.name,
      email: fields.email,
      region: fields.region,
      time: fields.slot,
      venue: fields.venue,
      referringProfessional: {
        name: fields.referringName,
        email: fields.referringEmail
      },
      product: fields.product,
      isPackage: fields.isPackage,
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: 'Until Revoked'
      },
      createdAt: new Date()
    };

    try {
      const db = getAdminDb();
      await db.collection('bookings').add(payload);
    } catch (e) {
      // Non-fatal in UAT: still return a bookingRef so you can continue to payment.
      console.error('WARN: could not write Firestore booking:', e?.message || e);
    }

    return NextResponse.json({ ok: true, bookingRef });
  } catch (e) {
    console.error('POST /api/book error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function GET() {
  // Tiny health check
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok: true, admin: 'ready' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'admin_init_failed' }, { status: 500 });
  }
}

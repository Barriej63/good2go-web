import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    // Required minimal fields
    const required = ['name','email','region','slot','venue','consentAccepted'];
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json({ ok:false, error:`Missing field: ${k}` }, { status: 400 });
      }
    }
    if (body.consentAccepted !== true) {
      return NextResponse.json({ ok:false, error:'Consent is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');

    // Amount (cents) – if not provided, fall back to baseline 6500
    const amount = Number.parseInt(body.amount ?? process.env.NEXT_PUBLIC_BASELINE_AMOUNT_CENTS ?? '6500', 10);

    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone || '',
      region: body.region,
      time: body.slot,
      venue: body.venue,
      referringProfessional: { name: body.referringName || '', email: body.referringEmail || '' },
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: body.consentDuration || 'Until Revoked',
      },
      amount,
      currency: 'NZD',
      bookingRef,
      status: 'pending_payment',
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection('bookings').add(payload);

    // Build redirect to our form-post relay page
    // We only include essentials; the relay will pull env for endpoint and field mapping
    const origin = req.nextUrl.origin;
    const sp = new URLSearchParams({ bid: docRef.id, ref: bookingRef, amount: String(amount) });
    const redirectUrl = `${origin}/pay/redirect?${sp.toString()}`;

    return NextResponse.json({ ok: true, id: docRef.id, bookingRef, redirectUrl });
  } catch (e) {
    console.error('POST /api/book error:', e);
    return NextResponse.json({ ok:false, error:'server_error' }, { status: 500 });
  }
}

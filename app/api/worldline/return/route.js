import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const bid = url.searchParams.get('bid');
  const status = (url.searchParams.get('status') || '').toLowerCase();
  const ref = url.searchParams.get('ref') || '';
  const adminDb = getAdminDb();

  if (!bid) {
    return NextResponse.json({ ok:false, error:'missing_bid' }, { status: 400 });
  }

  try {
    const update = {
      paymentReturnAt: new Date(),
      paymentStatus: status || 'unknown',
      paymentRaw: Object.fromEntries(url.searchParams.entries()),
    };
    if (status === 'success') {
      update.status = 'paid';
      update.paidAt = new Date();
    }
    await adminDb.collection('bookings').doc(bid).set(update, { merge: true });

    // After marking, send the user to /success with the booking ref
    const origin = req.nextUrl.origin;
    const successUrl = `${origin}/success?ref=${encodeURIComponent(ref || bid)}`;
    return NextResponse.redirect(successUrl, { status: 302 });
  } catch (e) {
    console.error('GET /api/worldline/return error:', e);
    return NextResponse.json({ ok:false, error:'server_error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin.js';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref') || '';
    if (!ref) {
      return NextResponse.redirect(new URL('/error?code=missing_ref', req.url));
    }

    // Best-effort: mark paid in Firestore by bookingRef
    try {
      const db = getAdminDb();
      const snap = await db.collection('bookings').where('bookingRef', '==', ref).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        await db.collection('bookings').doc(doc.id).set({
          paid: true,
          paidAt: new Date()
        }, { merge: true });
      }
    } catch (e) {
      console.error('WARN: could not mark paid:', e?.message || e);
    }

    const successUrl = new URL('/success', req.url);
    successUrl.searchParams.set('ref', ref);
    return NextResponse.redirect(successUrl);
  } catch (e) {
    return NextResponse.json({ ok:false, error:'return_handler_error' }, { status: 500 });
  }
}

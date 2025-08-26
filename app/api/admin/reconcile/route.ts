// app/api/admin/reconcile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true; // no lock if not configured
  const got = req.nextUrl.searchParams.get('token') || req.headers.get('x-admin-token');
  return got === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  }
  const db = getFirestoreFromAny();
  if (!db) return NextResponse.json({ ok:false, error:'no_db' }, { status: 200 });

  const url = new URL(req.url);
  const bookingId = url.searchParams.get('booking');
  const ref = url.searchParams.get('ref');
  const paid = url.searchParams.get('paid') === '1';
  const tx = url.searchParams.get('tx') || undefined;
  const amount = url.searchParams.get('amount') || undefined;

  if (!bookingId || !ref) {
    return NextResponse.json({ ok:false, error:'missing_params', need: ['booking','ref'] }, { status: 200 });
  }

  const bRef = (db as any).collection('bookings').doc(bookingId);
  const bSnap = await bRef.get();
  if (!bSnap.exists) {
    return NextResponse.json({ ok:false, error:'booking_not_found', bookingId }, { status: 200 });
  }

  const updates: any = { ref };
  if (paid) {
    const nowIso = new Date().toISOString();
    const cents = amount ? Math.round(parseFloat(amount) * 100) : (bSnap.get('amountCents') || null);
    updates.paid = true;
    updates.paidAt = nowIso;
    updates.status = 'paid';
    if (cents != null) updates.amountCents = cents;
    if (tx) {
      await bRef.collection('payments').doc(tx).set({
        reference: ref, tx, amount: amount || null, status: 'SUCCESSFUL',
        createdAt: nowIso, raw: { ManualReconcile: true }
      }, { merge: true });
    }
  }

  await bRef.set(updates, { merge: true });

  return NextResponse.json({ ok:true, bookingPath: bRef.path, updatesApplied: updates });
}

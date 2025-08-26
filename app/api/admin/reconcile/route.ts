// app/api/admin/reconcile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function okToken(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-admin-token') || '';
  return !!(process.env.ADMIN_TOKEN && token && token === process.env.ADMIN_TOKEN);
}

function centsFromAmount(amount?: any): number | null {
  const s = String(amount ?? '');
  const n = Number(s);
  return isFinite(n) ? Math.round(n*100) : null;
}

export async function POST(req: NextRequest) {
  if (!okToken(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });

  const db = getFirestoreFromAny();
  if (!db) return NextResponse.json({ ok:false, error:'no_db' }, { status: 200 });

  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '500', 10);
  const limit = Math.min(Math.max(limitParam, 1), 10000);

  let updated = 0, skipped = 0, missingBooking = 0, errors = 0;

  try {
    const snap = await db.collection('payments').orderBy('createdAt', 'desc').limit(limit).get();
    for (const doc of snap.docs) {
      const p = doc.data() || {};
      const ref = (p.reference || p.Reference || p.ref) as string | undefined;
      const amount = (p.amount || p.Amount) as string | number | undefined;
      if (!ref) { skipped++; continue; }

      const bRef = db.collection('bookings').doc(ref);
      const bSnap = await bRef.get();
      if (!bSnap.exists) { missingBooking++; continue; }

      const b = bSnap.data() || {};
      if (b.paid === true || (b.status && String(b.status).toLowerCase() === 'paid')) {
        skipped++;
        continue;
      }

      const patch: any = { status: 'paid', paid: true, paidAt: new Date().toISOString(), ref: ref };
      const c = centsFromAmount(amount);
      if (c != null) patch.amountCents = c;

      await bRef.set(patch, { merge: true });
      updated++;
    }
    return NextResponse.json({ ok:true, updated, skipped, missingBooking, errors });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e), updated, skipped, missingBooking, errors: errors+1 }, { status: 200 });
  }
}

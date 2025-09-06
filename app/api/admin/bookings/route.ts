// /app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = getFirestoreSafe();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 });
  }

  // last 100 bookings, newest first
  const snap = await db
    .collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, items });
}

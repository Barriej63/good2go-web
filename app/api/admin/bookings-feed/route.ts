// /app/api/admin/bookings-feed/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET(req: NextRequest) {
  const ok = await isAdminCookie();
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const db = getFirestoreSafe();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO string

  let q = db.collection('bookings');
  if (since) {
    // createdAt is stored as an ISO string in your project, so a string range works
    q = q.where('createdAt', '>', since);
  }
  q = q.orderBy('createdAt', 'asc').limit(200);

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, items });
}

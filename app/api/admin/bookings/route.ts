// /app/api/admin/bookings-feed/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO string expected (createdAt is string in your data)
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 1000);

  let q: any = db.collection('bookings') as any;

  if (since) {
    // createdAt is an ISO string in your project, lexicographic range works
    q = q.where('createdAt', '>', since);
  }

  // Show oldest first so incremental consumers can append
  q = q.orderBy('createdAt', 'asc').limit(limit);

  const snap = await q.get();
  const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ ok: true, items, count: items.length });
}

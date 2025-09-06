// app/api/admin/bookings-feed/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback'; // your working init helper

export async function GET(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { db } = getFirestoreSafe(); // assumes this returns {db}
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? '200');

  const snap = await db.collectionGroup('bookings')
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Math.max(limit, 1), 1000))
    .get();

  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, items });
}

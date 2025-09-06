// /app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);

  const q = db.collection('bookings').orderBy('createdAt', 'desc').limit(limit);
  const snap = await q.get();
  const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ ok: true, items, count: items.length });
}

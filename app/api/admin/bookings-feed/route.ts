import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestore } from '@/lib/firebaseServer';

export const dynamic = 'force-dynamic'; // avoid caching on Vercel

export async function GET(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const since = url.searchParams.get('since') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 1000);

  const db = getFirestore();
  const col = db.collection('bookings');

  // In your project "createdAt" is an ISO string, so lexicographic range works.
  let q:
    FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
    col.orderBy('createdAt').limit(limit);

  if (since) {
    q = col.where('createdAt', '>', since).orderBy('createdAt').limit(limit);
  }

  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

  return NextResponse.json({ ok: true, items });
}

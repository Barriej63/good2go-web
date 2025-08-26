// app/api/admin/bookings-feed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function okToken(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-admin-token') || '';
  return !!(process.env.ADMIN_TOKEN && token && token === process.env.ADMIN_TOKEN);
}

export async function GET(req: NextRequest) {
  if (!okToken(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const db = getFirestoreFromAny();
  if (!db) return NextResponse.json({ ok:false, error:'no_db' });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '200', 10), 1), 10000);
  const since = sp.get('since') || '';
  const order = (sp.get('order') || (since ? 'asc' : 'desc')) as 'asc'|'desc';

  const col = db.collection('bookings');
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = col as unknown as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

  if (since) {
    // createdAt is an ISO string in this project
    q = q.where('createdAt', '>', since);
  }
  q = q.orderBy('createdAt', order).limit(limit);

  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  // Compute latest createdAt we saw (max of list)
  let latestCreatedAt: string | null = null;
  for (const it of items) {
    const c = (it as any).createdAt;
    if (typeof c === 'string') {
      if (!latestCreatedAt || c > latestCreatedAt) latestCreatedAt = c;
    }
  }
  return NextResponse.json({ ok:true, items, count: items.length, latestCreatedAt });
}

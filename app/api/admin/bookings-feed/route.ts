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
  if (!db) return NextResponse.json({ ok:false, error:'no_db' }, { status: 200 });

  const limitParam = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);
  const limit = Math.min(Math.max(limitParam, 1), 10000);
  const since = req.nextUrl.searchParams.get('since'); // ISO string (exclusive)
  const order = (req.nextUrl.searchParams.get('order') || 'desc').toLowerCase(); // 'asc' or 'desc'

  try {
    let q = db.collection('bookings');
    if (since) {
      // createdAt is an ISO string in this project, so lexicographic works for range
      q = q.where('createdAt', '>', since);
    }
    q = q.orderBy('createdAt', order as FirebaseFirestore.OrderByDirection).limit(limit);
    const snap = await q.get();
    const items: any[] = [];
    let latestCreatedAt: string | null = null;
    for (const doc of snap.docs) {
      const d = doc.data();
      items.push({ id: doc.id, ...d });
      const ca = (d?.createdAt ?? null) as string | null;
      if (ca && (!latestCreatedAt || ca > latestCreatedAt)) latestCreatedAt = ca;
    }
    // If order=desc, items are newest first already; otherwise leave asc
    return NextResponse.json({ ok:true, count: items.length, latestCreatedAt, items });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e) }, { status: 200 });
  }
}

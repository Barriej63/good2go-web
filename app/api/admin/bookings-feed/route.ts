// app/api/admin/bookings-feed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;
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
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '2000', 10) || 2000, 10000);
  const cursor = url.searchParams.get('cursor'); // doc id to start after
  const q = (db as any).collection('bookings').orderBy('createdAt','desc');
  let query = q.limit(limit);
  if (cursor) {
    const docSnap = await (db as any).collection('bookings').doc(cursor).get();
    if (docSnap.exists) query = q.startAfter(docSnap.get('createdAt')).limit(limit);
  }
  const snap = await query.get();
  const items = snap.docs.map((d:any) => {
    const x = d.data() || {};
    return {
      id: d.id,
      createdAt: x.createdAt || null,
      date: x.date || null,
      name: x.name || null,
      email: x.email || null,
      region: x.region || null,
      status: x.status || null,
      amountCents: x.amountCents ?? null,
      start: x.slot?.start || null,
      end: x.slot?.end || null,
      ref: x.ref || x.reference || null,
    };
  });
  return NextResponse.json({ ok:true, count: items.length, items });
}

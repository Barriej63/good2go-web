import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestore } from '@/lib/firebaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  const db = getFirestore();

  if (id) {
    const doc = await db.collection('bookings').doc(id).get();
    if (!doc.exists) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, booking: { id: doc.id, ...doc.data() } });
  }

  // default: latest 200
  const snap = await db.collection('bookings').orderBy('createdAt', 'desc').limit(200).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ ok: true, items });
}

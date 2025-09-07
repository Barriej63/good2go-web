import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok:false, error:'firestore_init_failed' }, { status: 500 });

  const snap = await db.collection('config').doc('settings').get();
  const data = snap.exists ? snap.data() : { regions: [], slots: {}, venues: {} };
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });

  const role = await getAdminRole();
  if (role !== 'superadmin') return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok:false, error:'firestore_init_failed' }, { status: 500 });

  const body = await req.json();
  await db.collection('config').doc('settings').set(body, { merge: true });
  return NextResponse.json({ ok:true });
}

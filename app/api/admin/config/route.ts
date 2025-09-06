// /app/api/admin/config/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const ref = db.collection('config').doc('settings');
  const snap = await ref.get();

  // Reasonable defaults if missing
  const data = snap.exists ? snap.data() : { regions: [], timeslots: [] };
  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  // newest first; cap for safety
  const snap = await db.collection('bookings').orderBy('createdAt', 'desc').limit(500).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ ok: true, items, count: items.length });
}


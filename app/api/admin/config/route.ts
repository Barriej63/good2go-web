import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function GET() {
  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });
  const snap = await db.collection('config').doc('settings').get();
  const data = snap.exists ? snap.data() : { regions: [], timeslots: [] };
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  // Only superadmin should be able to save; middleware already checks, but double-check if you want
  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const regions = Array.isArray(body?.regions) ? body.regions : [];
  const timeslots = Array.isArray(body?.timeslots) ? body.timeslots : [];
  await db.collection('config').doc('settings').set({ regions, timeslots }, { merge: true });
  return NextResponse.json({ ok: true });
}


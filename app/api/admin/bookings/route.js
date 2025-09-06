// app/api/admin/bookings/route.js
import { NextResponse } from 'next/server';

async function getDb() {
  try {
    // Works with your existing helper if present (no build-time coupling)
    const mod = await import('@/lib/firebaseAdminFallback');
    if (mod.getFirestoreSafe) return await mod.getFirestoreSafe();
  } catch {}
  try {
    // Fallback: try firebase-admin if you already init elsewhere
    const admin = (await import('firebase-admin')).default;
    const { getFirestore } = await import('firebase-admin/firestore');
    if (!admin.apps?.length) throw new Error('admin_not_initialized');
    return getFirestore();
  } catch {}
  return null;
}

export async function GET(req) {
  const { isAdminCookie } = await import('@/lib/adminAuth');
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_unavailable' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO string of createdAt
  const limit = Math.min(1000, parseInt(searchParams.get('limit') || '100', 10));

  let q = db.collection('bookings').orderBy('createdAt', 'asc');
  if (since) q = q.where('createdAt', '>', since);
  q = q.limit(limit);

  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextSince = items.length ? items[items.length - 1].createdAt : null;

  return NextResponse.json({ ok: true, items, nextSince });
}

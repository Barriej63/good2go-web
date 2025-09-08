import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { DocumentData, FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/** GET — list admin users (newest first) */
export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const snap = await db.collection('admin_users').orderBy('createdAt', 'desc').limit(500).get();

  const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = (d.data() || {}) as any;
    return {
      id: d.id,
      email: data.email || '',
      role: data.role || 'viewer',
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    };
  });

  return NextResponse.json({ ok: true, items });
}

/** POST — create a new admin user (superadmin only) */
export async function POST(req: NextRequest) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const role = await getAdminRole();
  if (!requireSuperadmin(role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').trim().toLowerCase();
  const newRole = (body?.role || 'viewer').trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 });
  }
  if (!['superadmin', 'coach', 'viewer'].includes(newRole)) {
    return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
  }

  const db = getAdminDb();
  await db.collection('admin_users').add({
    email,
    role: newRole,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

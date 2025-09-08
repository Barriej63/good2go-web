// /app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return unauthorized();

  const db = getAdminDb();
  const snap = await db.collection('admin_users').orderBy('createdAt', 'desc').limit(500).get();

  const items = snap.docs.map(d => {
    const data = d.data() || {};
    return {
      id: d.id,
      email: data.email || '',
      role: data.role || 'viewer',
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    };
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return unauthorized();

  const role = await getAdminRole();
  if (!requireSuperadmin(role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body?.email || '').trim().toLowerCase();
  const newRole = body?.role === 'superadmin' || body?.role === 'coach' || body?.role === 'viewer'
    ? body.role
    : null;

  if (!email || !newRole) {
    return NextResponse.json({ ok: false, error: 'missing email or role' }, { status: 400 });
  }

  const db = getAdminDb();
  const doc = await db.collection('admin_users').add({
    email,
    role: newRole,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

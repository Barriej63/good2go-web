import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

type AdminUser = {
  name: string;
  email: string;
  role: 'superadmin' | 'coach' | 'viewer';
  status?: 'active' | 'disabled';
  createdAt?: string;
};

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const snap = await db.collection('adminUsers').orderBy('createdAt', 'desc').limit(1000).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const body = await req.json();
  const user: AdminUser = {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    role: (body.role || 'viewer') as AdminUser['role'],
    status: (body.status || 'active') as 'active' | 'disabled',
    createdAt: new Date().toISOString(),
  };

  if (!user.name || !user.email) {
    return NextResponse.json({ ok: false, error: 'name_email_required' }, { status: 400 });
  }
  if (!['superadmin', 'coach', 'viewer'].includes(user.role)) {
    return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
  }

  // Use email as stable doc id (safe-ish). If you prefer auto-id, swap to add().
  const id = user.email.replace(/[^\w.-]+/g, '_');
  await db.collection('adminUsers').doc(id).set(user, { merge: true });

  return NextResponse.json({ ok: true, id });
}


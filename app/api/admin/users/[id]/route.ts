import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  const id = params.id;
  const body = await req.json();
  const patch: any = {};
  if (body.name !== undefined) patch.name = String(body.name || '').trim();
  if (body.role !== undefined) {
    const r = String(body.role);
    if (!['superadmin', 'coach', 'viewer'].includes(r)) {
      return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
    }
    patch.role = r;
  }
  if (body.status !== undefined) {
    const s = String(body.status);
    if (!['active', 'disabled'].includes(s)) {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    }
    patch.status = s;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: 'no_patch' }, { status: 400 });
  }

  await db.collection('adminUsers').doc(id).set(patch, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok: false, error: 'firestore_init_failed' }, { status: 500 });

  await db.collection('adminUsers').doc(params.id).delete();
  return NextResponse.json({ ok: true });
}

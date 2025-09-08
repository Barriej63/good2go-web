// /app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Firestore, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

type AdminUser = {
  id: string;
  email?: string;
  name?: string;
  role?: 'superadmin' | 'coach' | 'viewer';
  createdAt?: string; // ISO
};

export async function GET() {
  const db = getAdminDb() as unknown as Firestore;
  const snap = await db.collection('admin_users').orderBy('createdAt', 'desc').limit(500).get();

  const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>): AdminUser => {
    const data = (d.data() || {}) as any;
    return {
      id: d.id,
      email: data.email || '',
      name: data.name || '',
      role: data.role || 'viewer',
      createdAt: data.createdAt || '',
    };
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const { email, name, role } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 });
  }
  const roleSafe: 'superadmin' | 'coach' | 'viewer' =
    role === 'superadmin' || role === 'coach' ? role : 'viewer';

  const db = getAdminDb() as unknown as Firestore;
  const createdAt = new Date().toISOString();

  // use a deterministic id (email) or let Firestore create one; keeping your current pattern:
  const docRef = db.collection('admin_users').doc(); // change to .doc(email) if you prefer stable IDs
  await docRef.set({ email, name: name || '', role: roleSafe, createdAt }, { merge: true });

  return NextResponse.json({ ok: true, id: docRef.id });
}

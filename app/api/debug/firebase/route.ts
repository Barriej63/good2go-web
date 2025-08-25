import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db: any = getFirestoreFromAny();
    const ok = !!db;
    let projectId: string | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const adminAny = require('firebase-admin');
      const admin = adminAny.default || adminAny;
      projectId = admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID || null;
    } catch {}

    const refQ = new URL(req.url).searchParams.get('ref') || '';
    let bookingPath = null;
    if (db && refQ) {
      const snap = await db.collectionGroup('bookings').where('ref','==', refQ).limit(1).get();
      if (!snap.empty) bookingPath = snap.docs[0].ref.path;
    }

    return NextResponse.json({ ok, projectId, refQueried: refQ || undefined, resolvedBookingPath: bookingPath, envProject: process.env.FIREBASE_PROJECT_ID || null });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}



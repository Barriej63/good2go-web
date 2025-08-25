import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let db:any = null, projectId = null;
    try {
      const adminAny = require('@/lib/firebaseAdmin') || require('../../../../lib/firebaseAdmin');
      const admin = adminAny.default || adminAny;
      db = admin.firestore();
      projectId = admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID || null;
    } catch (e:any) {}
    const refQ = new URL(req.url).searchParams.get('ref') || '';
    let bookingPath = null;
    if (db && refQ) {
      const snap = await db.collectionGroup('bookings').where('ref','==', refQ).limit(1).get();
      if (!snap.empty) bookingPath = snap.docs[0].ref.path;
    }
    return NextResponse.json({
      ok: !!db,
      projectId,
      refQueried: refQ || undefined,
      resolvedBookingPath: bookingPath || null,
      envProject: process.env.FIREBASE_PROJECT_ID || null
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error' }, { status: 500 });
  }
}


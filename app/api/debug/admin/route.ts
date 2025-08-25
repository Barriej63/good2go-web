// app/api/debug/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizedKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  const info = {
    keyLen: raw.length,
    hasEscapedNewlines: raw.includes('\\n'),
    hasHeader: raw.includes('-----BEGIN'),
    hasFooter: raw.includes('-----END'),
  };
  return { raw, info };
}

export async function GET(req: NextRequest) {
  const out: any = { env: {
    projectIdEnv: process.env.FIREBASE_PROJECT_ID || null,
    clientEmailEnv: process.env.FIREBASE_CLIENT_EMAIL || null,
  }};
  try {
    const { info } = normalizedKey();
    out.env = { ...out.env, ...info };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminAny = require('firebase-admin');
    const admin = adminAny.default || adminAny;
    const apps = admin.apps?.length ? admin.apps : (admin.getApps?.() || []);
    if (!apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.includes('-----BEGIN') ? process.env.FIREBASE_PRIVATE_KEY : (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        } as any),
      });
    }
    const app = admin.app();
    const db = admin.firestore();
    out.ok = true;
    out.projectId = app.options.projectId || null;
    await db.collection('_healthchecks').doc('admin-diagnose').set({ ts: new Date().toISOString() }, { merge: true });
    out.canWrite = true;
    return NextResponse.json(out);
  } catch (e:any) {
    out.ok = false;
    out.error = e?.message || String(e);
    return NextResponse.json(out, { status: 200 });
  }
}

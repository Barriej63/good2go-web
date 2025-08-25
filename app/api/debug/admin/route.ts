import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizedKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  const hasEscaped = raw.includes('\n');
  const val = hasEscaped ? raw.replace(/\n/g, '\n') : raw;
  return { raw, normalized: val, hasEscaped };
}

export async function GET(req: NextRequest) {
  const diag: any = {};
  try {
    const { raw, normalized, hasEscaped } = normalizedKey();
    diag.env = {
      projectIdEnv: process.env.FIREBASE_PROJECT_ID || null,
      clientEmailEnv: process.env.FIREBASE_CLIENT_EMAIL || null,
      keyLen: raw ? raw.length : 0,
      hasEscapedNewlines: hasEscaped,
      hasHeader: raw.includes('-----BEGIN PRIVATE KEY-----'),
      hasFooter: raw.includes('-----END PRIVATE KEY-----'),
    };
    const adminAny = require('firebase-admin');
    const admin = adminAny.default || adminAny;
    const apps = admin.apps?.length ? admin.apps : admin.getApps?.() || [];
    if (!apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalized,
        } as any),
      });
    }
    const app = admin.app();
    const db = admin.firestore();
    diag.ok = true;
    diag.projectId = app.options.projectId || null;
    // simple read so we know Firestore works (safe: collection that may not exist)
    await db.collection('_healthchecks').doc('admin-diagnose').set({ ts: new Date().toISOString() }, { merge: true });
    diag.canWrite = true;
    return NextResponse.json(diag);
  } catch (e: any) {
    diag.ok = false;
    diag.error = e?.message || String(e);
    return NextResponse.json(diag, { status: 200 });
  }
}

// /lib/firebaseAdminFallback.ts
/* Server-safe Firestore init for Vercel lambdas.
   Works whether you store FIREBASE_PRIVATE_KEY as a multi-line PEM
   or as a one-liner with \n escapes. */

let cached: FirebaseFirestore.Firestore | null = null;

function normalizePrivateKey(raw: string): string {
  if (!raw) return '';
  if (raw.includes('-----BEGIN') && raw.includes('PRIVATE KEY-----')) return raw;
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export function getFirestoreFromAny(): FirebaseFirestore.Firestore | null {
  if (cached) return cached;

  // 1) If your repo already has a firebaseAdmin helper, try to use it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminAny = require('@/lib/firebaseAdmin') || require('../lib/firebaseAdmin');
    const admin = adminAny.default || adminAny;
    cached = admin.firestore();
    return cached;
  } catch {
    /* ignore and fall through */
  }

  // 2) Fallback: init firebase-admin directly from env
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    const apps = admin.apps?.length ? admin.apps : (admin.getApps?.() || []);
    if (!apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || ''),
        } as any),
      });
    }
    cached = admin.firestore();
    return cached;
  } catch (e: any) {
    console.warn('⚠️ firebase-admin init failed:', e?.message || String(e));
    return null;
  }
}

/** Convenience alias name some files prefer. */
export const getFirestoreSafe = getFirestoreFromAny;

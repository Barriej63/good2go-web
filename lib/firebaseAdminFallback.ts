// lib/firebaseAdminFallback.ts
let cached: any = null;

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  // Support both escaped "\n" and real newlines
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export function getFirestoreFromAny(): FirebaseFirestore.Firestore | null {
  if (cached) return cached;

  // 1) Try project alias import if present
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminAny = require('@/lib/firebaseAdmin') || require('../lib/firebaseAdmin');
    const admin = adminAny.default || adminAny;
    cached = admin.firestore();
    return cached;
  } catch {}

  // 2) Try direct firebase-admin init from env
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    const apps = admin.apps?.length ? admin.apps : admin.getApps?.() || [];
    if (!apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: getPrivateKey(),
        }),
      });
    }
    cached = admin.firestore();
    return cached;
  } catch (e) {
    console.warn('⚠️ firebase-admin init failed:', (e as any)?.message || e);
    return null;
  }
}

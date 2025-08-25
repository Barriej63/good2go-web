// lib/firebaseAdminFallback.ts
let cached: any = null;

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  // If the key already looks like a PEM block, return as-is (supports true multi-line)
  if (raw.includes('-----BEGIN') && raw.includes('PRIVATE KEY-----')) return raw;
  // Otherwise, treat it as escaped newlines and normalize
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export function getFirestoreFromAny(): FirebaseFirestore.Firestore | null {
  if (cached) return cached;
  // Try using project helper if present in the repo
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adminAny = require('@/lib/firebaseAdmin') || require('../lib/firebaseAdmin');
    const admin = adminAny.default || adminAny;
    cached = admin.firestore();
    return cached;
  } catch {}
  // Fallback: initialize directly from env
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const admin = require('firebase-admin');
    const apps = admin.apps?.length ? admin.apps : (admin.getApps?.() || []);
    if (!apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: getPrivateKey(),
        } as any),
      });
    }
    cached = admin.firestore();
    return cached;
  } catch (e) {
    const msg = (e && (e as any).message) ? (e as any).message : String(e);
    console.warn('⚠️ firebase-admin init failed:', msg);
    return null;
  }
}

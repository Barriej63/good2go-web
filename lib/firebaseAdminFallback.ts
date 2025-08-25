let cached: any = null;

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

export function getFirestoreFromAny(): FirebaseFirestore.Firestore | null {
  if (cached) return cached;
  try {
    const adminAny = require('@/lib/firebaseAdmin') || require('../lib/firebaseAdmin');
    const admin = adminAny.default || adminAny;
    cached = admin.firestore();
    return cached;
  } catch {}
  try {
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
    console.warn('⚠️ firebase-admin init failed:', e?.message || e);
    return null;
  }
}

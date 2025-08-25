// lib/firebaseAdminFallback.ts
// Tries to obtain a Firestore instance either from your existing lib/firebaseAdmin
// or by initializing firebase-admin from env vars.
// No build-time import; dynamic import at runtime to avoid build failures if missing.

export async function getFirestoreSafe() {
  // Try your existing initializer first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@/lib/firebaseAdmin') || require('../lib/firebaseAdmin');
    const admin = mod.default || mod;
    if (admin?.firestore) {
      const db = admin.firestore();
      return { ok: true, db, source: 'project-lib' as const };
    }
  } catch {}
  // Fallback: dynamic import firebase-admin
  try {
    const admin = await import('firebase-admin');
    const apps = (admin as any).apps || (admin as any).default?.apps;
    const hasApp = apps && apps.length;
    if (!hasApp) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey && privateKey.startsWith('"')) {
        // Vercel can double-quote multiline secrets
        privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
      } else if (privateKey) {
        privateKey = privateKey.replace(/\n/g, '\n');
      }
      if (!projectId || !clientEmail || !privateKey) {
        return { ok:false, error:'missing_service_account_env' as const };
      }
      (admin as any).initializeApp({
        credential: (admin as any).credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
    const db = (admin as any).firestore();
    return { ok: true, db, source: 'fallback-admin' as const };
  } catch (e:any) {
    return { ok:false, error: 'firebase_admin_not_available', detail: e?.message || String(e) };
  }
}

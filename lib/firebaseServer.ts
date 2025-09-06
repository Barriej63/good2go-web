'use server';

import * as admin from 'firebase-admin';

let _app: admin.app.App | null = null;

/** Initialise or return the singleton Firebase Admin app. */
function getAdminApp(): admin.app.App {
  if (_app) return _app;

  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || '';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
    // Support both one-line and multi-line keys
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    _app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    _app = admin.app();
  }
  return _app!;
}

/** Get a Firestore instance (Admin SDK). */
export function getFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

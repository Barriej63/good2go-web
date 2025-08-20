// lib/firebaseAdmin.js
import * as admin from 'firebase-admin';

let _db = null;

export function getAdminDb() {
  if (_db) return _db;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');

  const creds = JSON.parse(raw);

  // Normalize private_key newlines so PEM is valid regardless of how it was pasted
  if (creds.private_key && creds.private_key.includes('\\n')) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(creds),
    });
  }

  _db = admin.firestore();
  return _db;
}

// lib/firebaseAdmin.js
import * as admin from 'firebase-admin';

let _db = null;

export function getAdminDb() {
  if (_db) return _db;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');

  const creds = JSON.parse(raw); // whole JSON object in one env var

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(creds),
    });
  }
  _db = admin.firestore();
  return _db;
}

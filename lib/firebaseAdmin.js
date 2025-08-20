import * as admin from "firebase-admin";

let app;
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env");

  const creds = JSON.parse(raw);
  app = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
} else {
  app = admin.app();
}

export const adminDb = admin.firestore(app);

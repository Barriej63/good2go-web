import * as admin from "firebase-admin";

let inited = false;

function init() {
  if (inited) return;
  if (admin.apps.length) { inited = true; return; }

  // Prefer full JSON in FIREBASE_SERVICE_ACCOUNT
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const sa = JSON.parse(svc);
    admin.initializeApp({
      credential: admin.credential.cert(sa as admin.ServiceAccount),
      projectId: sa.project_id,
    });
    inited = true;
    return;
  }

  // Fallback to 3 separate vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env (set FIREBASE_SERVICE_ACCOUNT or the 3 vars).");
  }
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    } as admin.ServiceAccount),
    projectId,
  });
  inited = true;
}

export function getAdminDb() {
  init();
  return admin.firestore();
}

export const adminDb = getAdminDb();  // keeps old imports working


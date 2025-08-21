import * as admin from "firebase-admin";

function init() {
  if (admin.apps.length) return admin.app();

  // Prefer full JSON if provided
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const sa = JSON.parse(svc);
    return admin.initializeApp({
      credential: admin.credential.cert(sa as admin.ServiceAccount),
      projectId: sa.project_id,
    });
  }

  // Fallback to 3 vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env");
  }
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    } as admin.ServiceAccount),
    projectId,
  });
}

init();
export const adminDb = admin.firestore();

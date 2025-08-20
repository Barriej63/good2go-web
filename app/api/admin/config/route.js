
// app/api/admin/config/route.js
import { getAdminDb } from "../../../../lib/firebaseAdmin";
import { verifyAdminToken } from "../../../../lib/adminAuth";

export async function GET(req) {
  const token = req.headers.get("authorization");
  if (!verifyAdminToken(token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getAdminDb();
  const configRef = db.collection("config").doc("settings");
  const doc = await configRef.get();
  if (!doc.exists) {
    return Response.json({ regions: [], timeslots: [] });
  }
  return Response.json(doc.data());
}

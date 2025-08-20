
// app/api/admin/bookings/route.js
import { getAdminDb } from "../../../../lib/firebaseAdmin";
import { verifyAdminToken } from "../../../../lib/adminAuth";

export async function GET(req) {
  const token = req.headers.get("authorization");
  if (!verifyAdminToken(token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getAdminDb();
  const snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
  const bookings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return Response.json(bookings);
}

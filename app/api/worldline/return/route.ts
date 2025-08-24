import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref") || "";
    if (!ref) return NextResponse.json({ ok: false, error: "missing_ref" }, { status: 400 });

    // In a proper integration you'd parse Worldline notify payload here and verify signatures
    const db = getAdminDb();
    const q = await db.collection("bookings").where("bookingRef","==",ref).limit(1).get();
    if (!q.empty) {
      await q.docs[0].ref.set({ paid: true, paidAt: new Date() }, { merge: true });
    }

    // Always land the user on success page
    return NextResponse.redirect(new URL(`/success?ref=${encodeURIComponent(ref)}`, url.origin));
  } catch (e) {
    console.error("POST /api/worldline/return error:", e);
    return NextResponse.json({ ok:false, error:"server_error" }, { status:500 });
  }
}

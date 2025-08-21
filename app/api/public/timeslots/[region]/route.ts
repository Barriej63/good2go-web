export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/firebaseAdmin";

export async function GET(_req: NextRequest, { params }: { params: { region: string } }) {
  const region = decodeURIComponent(params.region);
  try {
    const docRef = adminDb.collection("config").doc(`timeslots_${region}`);
    const snap = await docRef.get();
    const data = snap.exists ? snap.data() as any : { slots: [] };
    const slots = (data.slots || []).map((s: any) => ({
      weekday: s.weekday,
      start: s.start,
      end: s.end,
      venueAddress: s.venueAddress || "TBC",
      note: s.note || ""
    }));
    return NextResponse.json({ ok: true, slots });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to load timeslots" }, { status: 500 });
  }
}

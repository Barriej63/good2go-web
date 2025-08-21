export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/firebaseAdmin";

async function fetchSlotsForRegion(region: string) {
  const variants = [
    `timeslots_${region}`,
    `timeslots_${region.replace(/\s+/g, "")}`,
    `timeslots_${region.toLowerCase()}`,
    `timeslots_${region.toLowerCase().replace(/\s+/g, "")}`,
  ];
  let data: any = null;
  for (const id of variants) {
    const snap = await adminDb.collection("config").doc(id).get();
    if (snap.exists) { data = snap.data(); break; }
  }
  return (data?.slots || []).map((s: any) => ({
    weekday: s.weekday,
    start: s.start,
    end: s.end,
    venueAddress: s.venueAddress || "TBC",
    note: s.note || ""
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region");
  if (!region) return NextResponse.json({ ok:false, error:"Missing ?region=" }, { status:400 });
  const slots = await fetchSlotsForRegion(region);
  return NextResponse.json({ ok:true, slots });
}

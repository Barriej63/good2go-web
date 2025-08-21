// helper used by both routes
import { adminDb } from "@/src/firebaseAdmin";

export async function fetchSlotsForRegion(region: string) {
  const variants = [
    `timeslots_${region}`,
    `timeslots_${region.replace(/\s+/g, '')}`,
    `timeslots_${region.toLowerCase()}`,
    `timeslots_${region.toLowerCase().replace(/\s+/g, '')}`,
  ];
  let data: any = null;
  for (const id of variants) {
    const snap = await adminDb.collection("config").doc(id).get();
    if (snap.exists) { data = snap.data(); break; }
  }
  const slots = (data?.slots || []).map((s: any) => ({
    weekday: s.weekday,
    start: s.start,
    end: s.end,
    venueAddress: s.venueAddress || "TBC",
    note: s.note || ""
  }));
  return slots;
}

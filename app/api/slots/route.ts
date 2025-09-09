// app/api/slots/route.ts  — PUBLIC READ-ONLY feed for the Book page
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;           // 0..6
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

type SlotsOut = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

function toWeekday(v: unknown): number | null {
  if (typeof v === 'number' && v >= 0 && v <= 6) return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  const map: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tues: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thurs: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  return map[s] ?? null;
}

function regionFromId(id: string): string | null {
  // Accept timeslots_<Region> or timeslots-<Region>
  const m = id.match(/^timeslots[-_](.+)$/i);
  if (!m) return null;
  return m[1]; // keep original casing/spaces
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('config').get();

  const out: SlotsOut = { regions: [], slots: {} };

  for (const doc of snap.docs) {
    const region = regionFromId(doc.id);
    if (!region) continue;

    const data = doc.data() as any;
    const list: SlotDef[] = [];

    const push = (s: SlotDef) => list.push(s);

    // Style A: explicit array of slots
    if (Array.isArray(data?.slots)) {
      for (const it of data.slots as any[]) {
        const wd = toWeekday(it?.weekday ?? it?.weekdays);
        const st = it?.start;
        const en = it?.end;
        if (wd == null || !st || !en) continue;
        push({
          weekday: wd,
          start: String(st),
          end: String(en),
          venueAddress: it?.venueAddress ?? null,
          note: it?.note ?? null,
        });
      }
    }

    // Style B: single top-level fields (back-compat)
    const wdTop = toWeekday(data?.weekday ?? data?.weekdays);
    if (wdTop != null && data?.start && data?.end) {
      push({
        weekday: wdTop,
        start: String(data.start),
        end: String(data.end),
        venueAddress: data?.venueAddress ?? null,
        note: data?.note ?? null,
      });
    }

    out.slots[region] = list;
  }

  out.regions = Object.keys(out.slots).sort((a, b) => a.localeCompare(b));
  return NextResponse.json(out, { status: 200 });
}

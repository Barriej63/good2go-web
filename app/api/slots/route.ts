import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;           // 0=Sun..6=Sat
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
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  return map[s] ?? null;
}

function regionFromId(id: string): string | null {
  // Accept timeslots_<Region> or timeslots-<Region>
  const m = id.match(/^timeslots[-_](.+)$/i);
  if (!m) return null;
  // Preserve region name exactly as in Firestore (incl. spaces/case)
  return m[1];
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('config').get();

  const out: SlotsOut = { regions: [], slots: {} };

  for (const doc of snap.docs) {
    const rawId = doc.id;
    const region = regionFromId(rawId);
    if (!region) continue;

    const data = doc.data() as any;
    const list: SlotDef[] = [];

    const push = (s: SlotDef) => list.push(s);

    // Style A: explicit array
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

    // Style B: single top-level fields
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

    // Ensure the region is present even if no valid slots
    out.slots[region] = list;
  }

  // Regions list = all keys, keep stable alpha sort
  out.regions = Object.keys(out.slots).sort((a, b) => a.localeCompare(b));

  return NextResponse.json(out, { status: 200 });
}

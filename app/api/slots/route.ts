import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;           // 0=Sun ... 6=Sat
  start: string;             // "HH:mm"
  end: string;               // "HH:mm"
  venueAddress?: string | null;
  note?: string | null;
};

function nameToWeekday(v: unknown): number | null {
  if (typeof v === 'number' && v >= 0 && v <= 6) return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  const table: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  return table[s] ?? null;
}

function normRegionFromDocId(id: string): string {
  // timeslots_<Region> or timeslots-<Region>
  const m = id.match(/^timeslots[-_](.+)$/i);
  return m ? m[1] : id;
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('config').get();

  const slots: Record<string, SlotDef[]> = {};

  // Use typed iteration to avoid implicit any
  for (const doc of snap.docs) {
    const id: string = doc.id;
    if (!/^timeslots[-_]/i.test(id)) continue;

    const data = doc.data() as Record<string, any>;
    const region = normRegionFromDocId(id);

    const push = (s: SlotDef) => {
      if (!slots[region]) slots[region] = [];
      slots[region].push(s);
    };

    // Style A: array under 'slots'
    if (Array.isArray(data.slots)) {
      for (const raw of data.slots as any[]) {
        const wd = nameToWeekday((raw as any).weekday ?? (raw as any).weekdays);
        const start = (raw as any).start;
        const end = (raw as any).end;
        if (wd == null || !start || !end) continue;
        push({
          weekday: wd,
          start,
          end,
          venueAddress: (raw as any).venueAddress ?? null,
          note: (raw as any).note ?? null,
        });
      }
      continue;
    }

    // Style B: top-level fields
    const wdTop = nameToWeekday((data as any).weekday ?? (data as any).weekdays);
    if (wdTop != null && data.start && data.end) {
      push({
        weekday: wdTop,
        start: data.start,
        end: data.end,
        venueAddress: data.venueAddress ?? null,
        note: data.note ?? null,
      });
    }
  }

  // Build regions list
  const regions = Object.keys(slots).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ regions, slots }, { status: 200 });
}

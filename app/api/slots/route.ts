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

  // 1) Load the optional venues map: config/venues { [region]: string[] }
  let regionVenues: Record<string, string[]> = {};
  try {
    const venuesDoc = await db.collection('config').doc('venues').get();
    if (venuesDoc.exists) {
      const data = venuesDoc.data() as any;
      if (data && typeof data === 'object') {
        // normalize values to arrays of strings
        for (const [k, v] of Object.entries<any>(data)) {
          if (Array.isArray(v)) {
            regionVenues[k] = v.map(String).filter(Boolean);
          } else if (typeof v === 'string' && v.trim()) {
            regionVenues[k] = [v.trim()];
          }
        }
      }
    }
  } catch (e) {
    // non-fatal
    console.warn('slots: failed to load config/venues', e);
  }

  // 2) Gather timeslots_* docs
  const snap = await db.collection('config').get();

  const out: SlotsOut = { regions: [], slots: {} };

  for (const doc of snap.docs) {
    const rawId = doc.id;
    const region = regionFromId(rawId);
    if (!region) continue;

    const data = doc.data() as any;
    const list: SlotDef[] = [];

    const push = (s: SlotDef) => {
      // If slot has no venue, try to populate from venues list
      if (!s.venueAddress) {
        const fallback = regionVenues[region]?.[0];
        if (fallback) s.venueAddress = fallback;
      }
      list.push(s);
    };

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
          venueAddress: (it?.venueAddress ?? null) || null,
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
        venueAddress: (data?.venueAddress ?? null) || null,
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

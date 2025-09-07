import { NextResponse } from 'next/server';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;           // 0=Sun..6=Sat
  start: string;             // 'HH:MM'
  end: string;               // 'HH:MM'
  venueAddress?: string | null;
  note?: string | null;
};

type SlotsOut = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

/* ---------- helpers ---------- */

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

function cleanSlotLike(s: any): SlotDef | null {
  const wd = toWeekday(s?.weekday ?? s?.weekdays);
  const st = s?.start;
  const en = s?.end;
  if (wd == null || !st || !en) return null;
  return {
    weekday: wd,
    start: String(st),
    end: String(en),
    venueAddress: typeof s?.venueAddress === 'string' ? s.venueAddress : null,
    note: typeof s?.note === 'string' ? s.note : null,
  };
}

/* ---------- GET ---------- */

export async function GET() {
  const db = getFirestoreSafe();
  if (!db) {
    // soft-fail: empty config
    const empty: SlotsOut = { regions: [], slots: {} };
    return NextResponse.json(empty, { status: 200 });
  }

  const out: SlotsOut = { regions: [], slots: {} };

  // 1) Try the new single-doc config: config/settings
  const settingsSnap = await db.collection('config').doc('settings').get();
  if (settingsSnap.exists) {
    const data = settingsSnap.data() || {};
    const regions: string[] = Array.isArray(data.regions) ? data.regions : [];
    const rawSlots: Record<string, any[]> = (data.slots || {}) as Record<string, any[]>;
    // const venues: Record<string, string[]> = (data.venues || {}) as Record<string, string[]>; // available if needed

    for (const r of regions) {
      const arr = Array.isArray(rawSlots?.[r]) ? rawSlots[r] : [];
      out.slots[r] = arr
        .map(cleanSlotLike)
        .filter(Boolean) as SlotDef[];
    }
    out.regions = Object.keys(out.slots).sort((a, b) => a.localeCompare(b));
    return NextResponse.json(out, { status: 200 });
  }

  // 2) Fallback: legacy multi-doc layout under /config (timeslots_<Region> docs)
  const snap = await db.collection('config').get();

  for (const doc of snap.docs) {
    const rawId = doc.id;
    const region = regionFromId(rawId);
    if (!region) continue;

    const data = doc.data() as any;
    const list: SlotDef[] = [];

    // Style A: explicit array
    if (Array.isArray(data?.slots)) {
      for (const it of data.slots as any[]) {
        const cleaned = cleanSlotLike(it);
        if (cleaned) list.push(cleaned);
      }
    }

    // Style B: single top-level fields
    const cleanedTop = cleanSlotLike(data);
    if (cleanedTop) list.push(cleanedTop);

    out.slots[region] = list;
  }

  // Regions list = all keys, keep stable alpha sort
  out.regions = Object.keys(out.slots).sort((a, b) => a.localeCompare(b));

  return NextResponse.json(out, { status: 200 });
}

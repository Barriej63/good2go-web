import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

type SlotDef = {
  weekday: number; // 0=Sun..6=Sat
  start: string;   // "HH:mm"
  end: string;     // "HH:mm"
  venueAddress?: string;
  note?: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function toWeekdayIndex(v: unknown): number | null {
  if (typeof v === 'number') return Math.min(6, Math.max(0, v));
  if (typeof v === 'string') {
    const k = v.trim().toLowerCase();
    if (k in WEEKDAY_INDEX) return WEEKDAY_INDEX[k];
    const n = parseInt(k, 10);
    if (!Number.isNaN(n)) return Math.min(6, Math.max(0, n));
  }
  return null;
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('config').get();

  const regions: string[] = [];
  const slots: Record<string, SlotDef[]> = {};

  // Explicitly type doc to avoid implicit any
  snap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
    const id = doc.id; // e.g., timeslots_Waikato
    const m = id.match(/^timeslots[_-](.+)$/i);
    if (!m) return;
    const region = m[1].replace(/_/g, ' ').replace(/-/g, ' ');
    regions.push(region);

    const data = doc.data() as any;
    const list: SlotDef[] = [];

    // Case 1: array field 'slots'
    if (Array.isArray(data.slots)) {
      for (const s of data.slots) {
        const wd = toWeekdayIndex(s?.weekday);
        if (wd === null) continue;
        if (!s?.start || !s?.end) continue;
        list.push({
          weekday: wd,
          start: String(s.start),
          end: String(s.end),
          venueAddress: s.venueAddress || s.venue || data.venueAddress || undefined,
          note: s.note || data.note || undefined,
        });
      }
    }

    // Case 2: top-level fields
    const wdTop = toWeekdayIndex(data.weekday);
    if (wdTop !== null && data.start && data.end) {
      list.push({
        weekday: wdTop,
        start: String(data.start),
        end: String(data.end),
        venueAddress: data.venueAddress || undefined,
        note: data.note || undefined,
      });
    }

    if (list.length > 0) slots[region] = list;
  });

  // fallback if none found
  if (regions.length === 0) {
    const def = ['Auckland', 'Waikato', 'Bay of Plenty'];
    for (const r of def) {
      regions.push(r);
    }
    slots['Auckland'] = [{ weekday: 2, start: '17:30', end: '18:30' }];
    slots['Waikato'] = [{ weekday: 2, start: '17:30', end: '18:30', venueAddress: '' }];
    slots['Bay of Plenty'] = [{ weekday: 4, start: '11:00', end: '12:00' }];
  }

  return NextResponse.json({ regions, slots });
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;        // 0=Sun..6=Sat
  start: string;          // 'HH:mm'
  end: string;            // 'HH:mm'
  venueAddress?: string;
  note?: string;
};

function weekdayToNum(w: string | number): number | null {
  if (typeof w === 'number') return Math.max(0, Math.min(6, w));
  const map: Record<string, number> = {
    sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6
  };
  const key = String(w).trim().toLowerCase();
  return key in map ? map[key] : null;
}

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('config').get();

  const regions: string[] = [];
  const slots: Record<string, SlotDef[]> = {};

  snap.forEach((doc: any) => {
    const id: string = doc.id || '';
    const m = id.match(/^timeslots[_-](.+)$/i);
    if (!m) return;
    const region = m[1].replace(/_/g, ' ');
    regions.push(region);

    const data = doc.data() || {};
    const arr: SlotDef[] = [];

    if (Array.isArray(data.slots)) {
      for (const s of data.slots) {
        const wd = weekdayToNum(s.weekday);
        if (wd == null || !s.start || !s.end) continue;
        arr.push({ weekday: wd, start: s.start, end: s.end, venueAddress: s.venueAddress || data.venueAddress, note: s.note || data.note });
      }
    } else {
      const wd = weekdayToNum(data.weekday);
      if (wd != null && data.start && data.end) {
        arr.push({ weekday: wd, start: data.start, end: data.end, venueAddress: data.venueAddress, note: data.note });
      }
    }
    slots[region] = arr;
  });

  return NextResponse.json({ regions, slots });
}

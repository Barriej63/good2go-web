import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

type SlotDoc = {
  slots?: Array<{
    weekday?: string | number;
    start?: string;
    end?: string;
    venueAddress?: string;
    note?: string;
  }>;
  weekday?: string | number;
  start?: string;
  end?: string;
  venueAddress?: string;
  note?: string;
};

type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string;
  note?: string;
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
};

function toWeekday(v: string | number | undefined): number | null {
  if (typeof v === 'number') return Math.max(0, Math.min(6, v));
  if (!v) return null;
  const n = v.toLowerCase();
  if (n in WEEKDAYS) return WEEKDAYS[n];
  const num = Number(v);
  return Number.isFinite(num) ? Math.max(0, Math.min(6, num)) : null;
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

    const data = doc.data() as SlotDoc;
    const list: SlotDef[] = [];

    const pushSlot = (s: any) => {
      const wd = toWeekday(s?.weekday);
      if (wd == null || !s?.start || !s?.end) return;
      list.push({ weekday: wd, start: s.start, end: s.end, venueAddress: s.venueAddress, note: s.note });
    };

    if (Array.isArray(data.slots) && data.slots.length) {
      data.slots.forEach(pushSlot);
    } else {
      pushSlot(data);
    }
    slots[region] = list;
  });

  return NextResponse.json({ regions, slots });
}

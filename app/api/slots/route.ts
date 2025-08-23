import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { toWeekdayNumber } from '@/lib/weekdays';

export const dynamic = 'force-dynamic';

type SlotDef = { weekday:number, start:string, end:string, venueAddress?:string, note?:string };

function normRegionFromDocId(id:string): string {
  // id like "timeslots_Waikato" or "timeslots_Bay of Plenty"
  return id.replace(/^timeslots[_-]/i, '');
}

export async function GET() {
  const db = getAdminDb();
  const cfg = db.collection('config');
  const snap = await cfg.get();

  const regions: string[] = [];
  const slots: Record<string, SlotDef[]> = {};

  snap.forEach(doc => {
    const id = doc.id;
    if (!/^timeslots[_-]/i.test(id)) return;
    const region = normRegionFromDocId(id);
    const data = doc.data() || {};
    const arr: SlotDef[] = [];

    // case 1: slots array
    if (Array.isArray(data.slots)) {
      for (const item of data.slots) {
        const wd = toWeekdayNumber(item.weekday ?? item.weekdays);
        const start = item.start; const end = item.end;
        if (wd===null || !start || !end) continue;
        arr.push({ weekday: wd, start, end, venueAddress: item.venueAddress || data.venueAddress || '', note: item.note || data.note || '' });
      }
    }

    // case 2: single fields at top level
    const wdTop = toWeekdayNumber(data.weekday ?? data.weekdays);
    if (wdTop !== null && data.start && data.end) {
      arr.push({ weekday: wdTop, start: data.start, end: data.end, venueAddress: data.venueAddress || '', note: data.note || '' });
    }

    if (arr.length > 0) {
      regions.push(region);
      slots[region] = arr;
    }
  });

  // sort regions asc for UX
  regions.sort((a,b)=>a.localeCompare(b));
  return NextResponse.json({ regions, slots });
}

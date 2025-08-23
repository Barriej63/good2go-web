import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { weekdayToNumber } from '@/lib/weekdays';

export const dynamic = 'force-dynamic';

type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string;
  note?: string;
}

function normRegionId(id: string): string {
  // from "timeslots_Waikato" or "timeslots_Bay of Plenty" -> "Waikato" / "Bay of Plenty"
  return id.replace(/^timeslots[_-]/i, '').replace(/_/g, ' ').trim();
}

function asString(x: any): string | undefined {
  if (x === undefined || x === null) return undefined;
  return String(x);
}

export async function GET() {
  try {
    const db = getAdminDb();
    const col = db.collection('config');
    const snap = await col.get();
    const regions: string[] = [];
    const slots: Record<string, SlotDef[]> = {};

    snap.forEach((doc: any) => {
      const id: string = doc.id || '';
      if (!/^timeslots[_-]/i.test(id)) return;
      const region = normRegionId(id);
      const data = doc.data() || {};

      const out: SlotDef[] = [];

      // Case 1: array "slots" of objects
      if (Array.isArray(data.slots) && data.slots.length) {
        for (const raw of data.slots) {
          if (raw && typeof raw === 'object') {
            const wd = weekdayToNumber(raw.weekday ?? raw.weekdays);
            const start = asString(raw.start);
            const end = asString(raw.end);
            if (wd !== null && start && end) {
              out.push({
                weekday: wd,
                start,
                end,
                venueAddress: asString(raw.venueAddress) ?? asString(data.venueAddress),
                note: asString(raw.note) ?? asString(data.note),
              });
            }
          }
        }
      }

      // Case 2: single top-level fields (start/end + weekday or weekdays)
      const topWd = weekdayToNumber(data.weekday ?? data.weekdays);
      const topStart = asString(data.start);
      const topEnd = asString(data.end);
      if (topWd !== null && topStart && topEnd) {
        out.push({
          weekday: topWd,
          start: topStart,
          end: topEnd,
          venueAddress: asString(data.venueAddress),
          note: asString(data.note),
        });
      }

      if (out.length) {
        regions.push(region);
        slots[region] = out;
      }
    });

    // Sort regions alphabetically; keep Auckland first if present
    regions.sort((a, b) => a.localeCompare(b));
    const idx = regions.indexOf('Auckland');
    if (idx > 0) { regions.splice(idx,1); regions.unshift('Auckland'); }

    return NextResponse.json({ regions, slots });
  } catch (e) {
    console.error('GET /api/slots error:', e);
    return NextResponse.json({ regions: [], slots: {} });
  }
}

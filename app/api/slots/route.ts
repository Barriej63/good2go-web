import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

type SlotDef = { weekday: number, start: string, end: string, venueAddress?: string, note?: string };

function weekdayToNumber(w: any): number | null {
  if (typeof w === 'number') return Math.max(0, Math.min(6, w));
  if (typeof w !== 'string') return null;
  const s = w.toLowerCase().slice(0,3);
  const map: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
  return map[s] ?? null;
}

export async function GET() {
  try {
    const db = getAdminDb();
    const cfgCol = db.collection('config');
    const snap = await cfgCol.get();
    const regions: string[] = [];
    const slots: Record<string, SlotDef[]> = {};

    snap.forEach(doc => {
      const id = doc.id; // e.g., timeslots_Waikato
      const m = id.match(/^timeslots[_-](.+)$/i);
      if (!m) return;
      const region = m[1].replace(/_/g, ' ');
      const data = doc.data() || {};
      const arr = Array.isArray(data.slots) ? data.slots : [{ weekday: data.weekday, start: data.start, end: data.end, venueAddress: data.venueAddress, note: data.note }];
      const norm: SlotDef[] = [];
      for (const s of arr) {
        const wd = weekdayToNumber((s?.weekday ?? data.weekday) || '');
        if (wd === null || !s?.start || !s?.end) continue;
        norm.push({ weekday: wd, start: String(s.start), end: String(s.end), venueAddress: s.venueAddress || data.venueAddress, note: s.note || data.note });
      }
      if (norm.length) {
        regions.push(region);
        slots[region] = norm;
      }
    });

    if (!regions.length) {
      // Fallback defaults (Tue for AKL/WKO, Thu for BOP)
      return NextResponse.json({
        regions: ['Auckland', 'Waikato', 'Bay of Plenty'],
        slots: {
          'Auckland': [{ weekday: 2, start: '17:30', end: '18:30' }],
          'Waikato': [{ weekday: 2, start: '17:30', end: '18:30' }],
          'Bay of Plenty': [{ weekday: 4, start: '11:00', end: '12:00' }]
        }
      });
    }

    return NextResponse.json({ regions, slots });
  } catch (e:any) {
    console.error('GET /api/slots error', e);
    return NextResponse.json({ error: 'slots_error', message: e?.message || 'failed' }, { status: 500 });
  }
}

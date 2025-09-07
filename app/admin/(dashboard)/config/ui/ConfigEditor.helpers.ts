// Helper functions for managing regions, venues, and slots.
// SAFE: pure functions that return new objects (no in-place mutation).

export type SlotDef = {
  weekday: number; // 0..6 Sun..Sat
  start: string;   // 'HH:MM'
  end: string;     // 'HH:MM'  (kept for compatibility with booking UI)
  venueAddress?: string | null;
  note?: string | null;
};

export type SettingsDoc = {
  regions: string[];
  slots: Record<string, SlotDef[]>;      // per-region slots
  venues?: Record<string, string[]>;     // per-region list of venues
};

/* ---- Time utils ---- */
export function isValidHHMM(s: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(s) && (() => {
    const [h, m] = s.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  })();
}
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
export function fromMinutes(mins: number): string {
  let m = ((mins % 1440) + 1440) % 1440; // wrap
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

/* ---- Regions ---- */
export function addRegion(doc: SettingsDoc, name: string): SettingsDoc {
  const n = (name || '').trim();
  if (!n) return doc;
  if ((doc.regions || []).includes(n)) return doc;
  return {
    ...doc,
    regions: [...(doc.regions || []), n],
    slots: { ...(doc.slots || {}), [n]: (doc.slots?.[n] || []) },
    venues: { ...(doc.venues || {}), [n]: (doc.venues?.[n] || []) },
  };
}
export function removeRegion(doc: SettingsDoc, name: string): SettingsDoc {
  const regions = (doc.regions || []).filter(r => r !== name);
  const { [name]: _s, ...restSlots } = doc.slots || {};
  const { [name]: _v, ...restVenues } = doc.venues || {};
  return { ...doc, regions, slots: restSlots, venues: restVenues };
}

/* ---- Venues ---- */
export function addVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region) return doc;
  const v = (venue || '').trim();
  if (!v) return doc;
  const list = [ ...(doc.venues?.[region] || []) ];
  if (list.includes(v)) return doc;
  const venues = { ...(doc.venues || {}), [region]: [...list, v] };
  return { ...doc, venues };
}
export function removeVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region) return doc;
  const list = (doc.venues?.[region] || []).filter(x => x !== venue);
  const venues = { ...(doc.venues || {}), [region]: list };
  return { ...doc, venues };
}

/* ---- Single-slot ops ---- */
export function addSlot(doc: SettingsDoc, region: string, seed?: Partial<SlotDef>): SettingsDoc {
  if (!region) return doc;
  const arr = [ ...(doc.slots?.[region] || []) ];
  const start = seed?.start ?? '09:00';
  const end   = seed?.end   ?? '10:00';
  arr.push({
    weekday: seed?.weekday ?? 1,
    start, end,
    venueAddress: seed?.venueAddress ?? '',
    note: seed?.note ?? null,
  });
  const slots = { ...(doc.slots || {}), [region]: arr };
  return { ...doc, slots };
}
export function updateSlot(doc: SettingsDoc, region: string, index: number, patch: Partial<SlotDef>): SettingsDoc {
  if (!region) return doc;
  const arr = [ ...(doc.slots?.[region] || []) ];
  if (index < 0 || index >= arr.length) return doc;
  arr[index] = { ...arr[index], ...patch };
  const slots = { ...(doc.slots || {}), [region]: arr };
  return { ...doc, slots };
}
export function removeSlot(doc: SettingsDoc, region: string, index: number): SettingsDoc {
  if (!region) return doc;
  const arr = [ ...(doc.slots?.[region] || []) ];
  if (index < 0 || index >= arr.length) return doc;
  arr.splice(index, 1);
  const slots = { ...(doc.slots || {}), [region]: arr };
  return { ...doc, slots };
}

/* ---- Grid generator (e.g., 10-min steps) ---- */
export function generateGridSlots(
  doc: SettingsDoc,
  region: string,
  opts: {
    weekday: number;         // 0..6
    windowStart: string;     // 'HH:MM'
    windowEnd: string;       // 'HH:MM' (exclusive)
    stepMinutes: number;     // e.g., 10
    venueAddress?: string;   // optional
    note?: string | null;    // optional
  }
): SettingsDoc {
  if (!region) return doc;
  const { weekday, windowStart, windowEnd, stepMinutes, venueAddress, note } = opts;
  if (!isValidHHMM(windowStart) || !isValidHHMM(windowEnd) || stepMinutes <= 0) return doc;

  const startMin = toMinutes(windowStart);
  const endMin   = toMinutes(windowEnd);
  if (endMin <= startMin) return doc;

  const arr = [ ...(doc.slots?.[region] || []) ];
  for (let t = startMin; t < endMin; t += stepMinutes) {
    const start = fromMinutes(t);
    const end   = fromMinutes(Math.min(t + stepMinutes, endMin)); // keep `end` for UI compatibility
    arr.push({
      weekday,
      start,
      end,
      venueAddress: venueAddress ?? '',
      note: note ?? null,
    });
  }
  const slots = { ...(doc.slots || {}), [region]: arr };
  return { ...doc, slots };
}

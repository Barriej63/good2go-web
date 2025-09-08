// /app/admin/(dashboard)/config/ui/ConfigEditor.helpers.ts
export type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

export type SettingsDoc = {
  regions: string[];
  venues: Record<string, string[]>;     // region -> list of venue names/addresses
  slots:   Record<string, SlotDef[]>;   // region -> list of slots
};

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** ---------- local mutators (UI state) ---------- */
export function addRegion(doc: SettingsDoc, name: string): SettingsDoc {
  if (!name.trim()) return doc;
  if (doc.regions.includes(name)) return doc;
  return {
    ...doc,
    regions: [...doc.regions, name],
    venues: { ...doc.venues, [name]: doc.venues[name] ?? [] },
    slots:  { ...doc.slots,  [name]: doc.slots[name]  ?? [] },
  };
}

export function removeRegion(doc: SettingsDoc, name: string): SettingsDoc {
  if (!doc.regions.includes(name)) return doc;
  const { [name]: _v, ...restVenues } = doc.venues;
  const { [name]: _s, ...restSlots }  = doc.slots;
  return {
    ...doc,
    regions: doc.regions.filter(r => r !== name),
    venues: restVenues,
    slots:  restSlots,
  };
}

export function addVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region || !venue.trim()) return doc;
  const list = doc.venues[region] ?? [];
  if (list.includes(venue)) return doc;
  return {
    ...doc,
    venues: { ...doc.venues, [region]: [...list, venue] }
  };
}

export function removeVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region) return doc;
  const list = doc.venues[region] ?? [];
  return {
    ...doc,
    venues: { ...doc.venues, [region]: list.filter(v => v !== venue) }
  };
}

export function addSlot(doc: SettingsDoc, region: string): SettingsDoc {
  const list = doc.slots[region] ?? [];
  const next: SlotDef = { weekday: 2, start: '17:30', end: '18:30', venueAddress: '', note: '' };
  return {
    ...doc,
    slots: { ...doc.slots, [region]: [...list, next] }
  };
}

export function updateSlot(
  doc: SettingsDoc,
  region: string,
  index: number,
  patch: Partial<SlotDef>
): SettingsDoc {
  const list = doc.slots[region] ?? [];
  if (index < 0 || index >= list.length) return doc;
  const next = list.slice();
  next[index] = { ...next[index], ...patch };
  return { ...doc, slots: { ...doc.slots, [region]: next } };
}

export function removeSlot(doc: SettingsDoc, region: string, index: number): SettingsDoc {
  const list = doc.slots[region] ?? [];
  if (index < 0 || index >= list.length) return doc;
  const next = list.slice();
  next.splice(index, 1);
  return { ...doc, slots: { ...doc.slots, [region]: next } };
}

/** ---------- utilities ---------- */
export function isValidHHMM(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

function pad2(n: number){ return String(n).padStart(2,'0'); }
function toMinutes(hhmm: string){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function fromMinutes(m: number){ const h=Math.floor(m/60), mm=m%60; return `${pad2(h)}:${pad2(mm)}`; }

/** Generate a grid of slots between a window on a weekday. */
export function generateGridSlots(
  doc: SettingsDoc,
  region: string,
  opts: { weekday: number; windowStart: string; windowEnd: string; stepMinutes: number; venueAddress?: string }
): SettingsDoc {
  const { weekday, windowStart, windowEnd, stepMinutes, venueAddress } = opts;
  if (!isValidHHMM(windowStart) || !isValidHHMM(windowEnd) || stepMinutes <= 0) return doc;

  const start = toMinutes(windowStart);
  const end   = toMinutes(windowEnd);
  if (end <= start) return doc;

  const list = doc.slots[region] ?? [];
  const gen: SlotDef[] = [];
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    gen.push({
      weekday,
      start: fromMinutes(t),
      end:   fromMinutes(t + stepMinutes),
      venueAddress: venueAddress ?? '',
      note: ''
    });
  }
  return { ...doc, slots: { ...doc.slots, [region]: [...list, ...gen] } };
}

/** ---------- server calls for /api/admin/slots (needs token) ---------- */

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? '';

async function authedFetch(input: RequestInfo, init?: RequestInit) {
  if (!ADMIN_TOKEN) {
    // Helpful console message if the public token isn't configured.
    console.warn('NEXT_PUBLIC_ADMIN_TOKEN is not set – admin slot edits will be rejected by the API.');
  }
  const headers = new Headers(init?.headers || {});
  headers.set('content-type', 'application/json');
  headers.set('x-admin-token', ADMIN_TOKEN);
  const res = await fetch(input, { ...init, headers });
  return res;
}

/** Create a single slot on the server */
export async function apiAddSlot(region: string, slot: SlotDef) {
  const res = await authedFetch('/api/admin/slots', {
    method: 'POST',
    body: JSON.stringify({ region, slot })
  });
  if (!res.ok) {
    const j = await safeJson(res);
    throw new Error(`add_slot_failed${j?.error ? `: ${j.error}` : ''}`);
  }
}

/** Patch a single slot (by index) */
export async function apiPatchSlot(region: string, index: number, patch: Partial<SlotDef>) {
  const res = await authedFetch('/api/admin/slots', {
    method: 'PATCH',
    body: JSON.stringify({ region, index, ...patch })
  });
  if (!res.ok) {
    const j = await safeJson(res);
    throw new Error(`patch_slot_failed${j?.error ? `: ${j.error}` : ''}`);
  }
}

/** Delete a single slot */
export async function apiDeleteSlot(region: string, index: number) {
  const url = `/api/admin/slots?region=${encodeURIComponent(region)}&index=${index}`;
  const res = await authedFetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const j = await safeJson(res);
    throw new Error(`delete_slot_failed${j?.error ? `: ${j.error}` : ''}`);
  }
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

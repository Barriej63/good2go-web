// /app/admin/(dashboard)/config/ui/ConfigEditor.helpers.ts
export type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string;
  note?: string;
};

export type SettingsDoc = {
  regions: string[];
  venues: Record<string, string[]>;
  slots: Record<string, SlotDef[]>;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidHHMM = (v: string) => HHMM.test(v);

// ---- local state helpers ----------------------------------------------------

export function addRegion(doc: SettingsDoc, name: string): SettingsDoc {
  if (!name || doc.regions.includes(name)) return doc;
  return {
    ...doc,
    regions: [...doc.regions, name],
    venues: { ...doc.venues, [name]: [] },
    slots: { ...doc.slots, [name]: [] },
  };
}

export function removeRegion(doc: SettingsDoc, name: string): SettingsDoc {
  const regions = doc.regions.filter(r => r !== name);
  const { [name]: _, ...venues } = doc.venues || {};
  const { [name]: __, ...slots } = doc.slots || {};
  return { ...doc, regions, venues, slots };
}

export function addVenue(doc: SettingsDoc, region: string, v: string): SettingsDoc {
  const cur = doc.venues?.[region] || [];
  if (!v || cur.includes(v)) return doc;
  return { ...doc, venues: { ...doc.venues, [region]: [...cur, v] } };
}

export function removeVenue(doc: SettingsDoc, region: string, v: string): SettingsDoc {
  const cur = doc.venues?.[region] || [];
  return { ...doc, venues: { ...doc.venues, [region]: cur.filter(x => x !== v) } };
}

export function addSlot(doc: SettingsDoc, region: string): SettingsDoc {
  const cur = doc.slots?.[region] || [];
  const next: SlotDef = { weekday: 1, start: '17:30', end: '18:30', venueAddress: '' };
  return { ...doc, slots: { ...doc.slots, [region]: [...cur, next] } };
}

export function removeSlot(doc: SettingsDoc, region: string, index: number): SettingsDoc {
  const cur = doc.slots?.[region] || [];
  if (index < 0 || index >= cur.length) return doc;
  const copy = cur.slice();
  copy.splice(index, 1);
  return { ...doc, slots: { ...doc.slots, [region]: copy } };
}

export function updateSlot(
  doc: SettingsDoc,
  region: string,
  index: number,
  patch: Partial<SlotDef>
): SettingsDoc {
  const cur = doc.slots?.[region] || [];
  if (index < 0 || index >= cur.length) return doc;
  const copy = cur.slice();
  copy[index] = { ...copy[index], ...patch };
  return { ...doc, slots: { ...doc.slots, [region]: copy } };
}

export function generateGridSlots(
  doc: SettingsDoc,
  region: string,
  opts: { weekday: number; windowStart: string; windowEnd: string; stepMinutes: number; venueAddress?: string }
): SettingsDoc {
  const { weekday, windowStart, windowEnd, stepMinutes, venueAddress } = opts;
  if (!isValidHHMM(windowStart) || !isValidHHMM(windowEnd) || stepMinutes <= 0) return doc;

  const [sh, sm] = windowStart.split(':').map(n => parseInt(n, 10));
  const [eh, em] = windowEnd.split(':').map(n => parseInt(n, 10));
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  const acc: SlotDef[] = [];
  for (let t = start; t + stepMinutes <= end; t += stepMinutes) {
    const sH = String(Math.floor(t / 60)).padStart(2, '0');
    const sM = String(t % 60).padStart(2, '0');
    const eMin = t + stepMinutes;
    const eH = String(Math.floor(eMin / 60)).padStart(2, '0');
    const eM = String(eMin % 60).padStart(2, '0');
    acc.push({
      weekday,
      start: `${sH}:${sM}`,
      end: `${eH}:${eM}`,
      venueAddress: venueAddress || '',
    });
  }

  return { ...doc, slots: { ...doc.slots, [region]: acc } };
}

// ---- network helpers (admin slots API) --------------------------------------

function adminToken(): string {
  const t = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
  return t;
}

async function api(method: 'POST'|'PATCH'|'DELETE', url: string, body?: any) {
  const token = adminToken();
  if (!token) throw new Error('missing_admin_token');

  const r = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-admin-token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!r.ok || (json && json.ok === false)) {
    const msg = (json && (json.error || json.message)) || `http_${r.status}`;
    console.error('Admin slots API error:', { url, method, status: r.status, body, response: json || text });
    throw new Error(msg);
  }
  return json;
}

// Call these from the component after updating local state, so the UI feels instant.

export async function netAddSlot(region: string, slot: SlotDef) {
  return api('POST', '/api/admin/slots', { region, slot });
}

export async function netPatchSlot(region: string, index: number, patch: Partial<SlotDef>) {
  return api('PATCH', '/api/admin/slots', { region, index, ...patch });
}

export async function netRemoveSlot(region: string, index: number) {
  const url = `/api/admin/slots?region=${encodeURIComponent(region)}&index=${index}`;
  return api('DELETE', url);
}

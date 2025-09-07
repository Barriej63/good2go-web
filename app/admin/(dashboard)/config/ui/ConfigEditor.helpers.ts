export type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

export type SettingsDoc = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
  venues?: Record<string, string[]>;
};

export function addRegion(doc: SettingsDoc, name: string): SettingsDoc {
  if (!name) return doc;
  if ((doc.regions || []).includes(name)) return doc;
  return {
    ...doc,
    regions: [...(doc.regions || []), name],
    slots: { ...(doc.slots || {}), [name]: (doc.slots?.[name] || []) },
    venues: { ...(doc.venues || {}), [name]: (doc.venues?.[name] || []) },
  };
}

export function removeRegion(doc: SettingsDoc, name: string): SettingsDoc {
  if (!name) return doc;
  const regions = (doc.regions || []).filter(r => r !== name);
  const { [name]: _, ...restSlots } = doc.slots || {};
  const { [name]: __, ...restVenues } = doc.venues || {};
  return { ...doc, regions, slots: restSlots, venues: restVenues };
}

export function addVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region || !venue) return doc;
  const list = [ ...(doc.venues?.[region] || []) ];
  if (list.includes(venue)) return doc;
  const venues = { ...(doc.venues || {}), [region]: [...list, venue] };
  return { ...doc, venues };
}

export function removeVenue(doc: SettingsDoc, region: string, venue: string): SettingsDoc {
  if (!region || !venue) return doc;
  const list = (doc.venues?.[region] || []).filter(v => v !== venue);
  const venues = { ...(doc.venues || {}), [region]: list };
  return { ...doc, venues };
}

export function addSlot(doc: SettingsDoc, region: string, seed?: Partial<SlotDef>): SettingsDoc {
  if (!region) return doc;
  const arr = [ ...(doc.slots?.[region] || []) ];
  arr.push({
    weekday: seed?.weekday ?? 1,
    start:   seed?.start   ?? '09:00',
    end:     seed?.end     ?? '10:00',
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

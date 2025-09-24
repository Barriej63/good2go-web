// Dedupe region slots by time (start–end), keep the weekdays those times appear on.
export type SlotDef = {
  weekday: number;       // 0=Sun … 6=Sat
  start: string;         // "14:00"
  end: string;           // "14:10"
  venueAddress?: string | null;
  note?: string | null;
};

export type CompressedTime = {
  key: string;           // "14:00-14:10"
  start: string;
  end: string;
  days: number[];        // e.g. [2,4] for Tue/Thu
  label: string;         // "14:00"  (or "14:00 – 14:10" if you prefer)
};

export function compressSlotsByTime(slots: SlotDef[]): CompressedTime[] {
  const map = new Map<string, { start:string; end:string; days:Set<number> }>();
  for (const s of slots) {
    const key = `${s.start}-${s.end}`;
    if (!map.has(key)) map.set(key, { start: s.start, end: s.end, days: new Set() });
    map.get(key)!.days.add(s.weekday);
  }
  return Array.from(map.values())
    .map(v => ({
      key: `${v.start}-${v.end}`,
      start: v.start,
      end: v.end,
      days: Array.from(v.days).sort((a,b)=>a-b),
      label: v.start, // change to `${v.start} – ${v.end}` if you want the full range
    }))
    .sort((a,b) => a.start.localeCompare(b.start));
}

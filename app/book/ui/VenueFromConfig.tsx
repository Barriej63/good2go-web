'use client';
import React from 'react';

type Slot = { weekday: number; start: string; end: string; venueAddress?: string | null; note?: string | null };
type SlotsOut = { regions: string[]; slots: Record<string, Slot[]> };

function normalizeTime(s: string) {
  // keep HH:MM from inputs like "17:30–18:00" or "17:30"
  const m = String(s || '').match(/\b(\d{2}:\d{2})/);
  return m ? m[1] : '';
}

export default function VenueFromConfig({
  region,
  time,         // string like "17:30" (or label that contains it)
  fallback,
}: {
  region: string;
  time: string;
  fallback: string; // current venue from your existing logic
}) {
  const [{ data, ready }, setState] = React.useState<{ data: SlotsOut | null; ready: boolean }>({ data: null, ready: false });

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j = (await r.json()) as SlotsOut;
        if (alive) setState({ data: j, ready: true });
      } catch {
        if (alive) setState({ data: null, ready: true });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!ready || !data) return <>{fallback}</>;

  const list = data.slots?.[region] || [];
  const hhmm = normalizeTime(time);
  const match =
    list.find(s => normalizeTime(s.start) === hhmm) ||
    list.find(s => normalizeTime(`${s.start}`) === hhmm); // second chance; harmless

  const venue = match?.venueAddress?.trim();
  return <>{venue || fallback}</>;
}

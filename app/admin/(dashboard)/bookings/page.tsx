'use client';

import { useEffect, useState } from 'react';

// Firestore Timestamp type guard (works whether the object is plain or coming from SDK)
function isFSTimestamp(x: any): x is { toDate: () => Date } {
  return x && typeof x === 'object' && typeof x.toDate === 'function';
}

// Robust date -> string
function fmtWhen(x: any): string {
  if (!x) return '';
  try {
    if (typeof x === 'string') return x;
    if (isFSTimestamp(x)) return x.toDate().toISOString();
    // sometimes createdAt is ISO-like or millis
    if (typeof x === 'number') return new Date(x).toISOString();
    if (x.seconds) return new Date(x.seconds * 1000).toISOString();
  } catch {}
  return String(x ?? '');
}

function fmtSlot(slot: any, row: any): string {
  // slot as string
  if (typeof slot === 'string') return slot;

  // slot as object { weekday, start, end, venueAddress, note }
  if (slot && typeof slot === 'object') {
    const start = slot.start ?? row?.start ?? '';
    const end = slot.end ?? row?.end ?? '';
    const dateISO = row?.dateISO ?? '';
    const venue = slot.venueAddress ?? row?.venueAddress ?? '';
    const time = end ? `${start}–${end}` : start || '';
    const core = [dateISO, time].filter(Boolean).join(' ');
    return [core, venue].filter(Boolean).join(' @ ');
  }

  // derive from row fields if present
  const start = row?.start ?? '';
  const end = row?.end ?? '';
  const dateISO = row?.dateISO ?? '';
  const time = end ? `${start}–${end}` : start || '';
  return [dateISO, time].filter(Boolean).join(' ');
}

type Booking = {
  id: string;
  createdAt?: any;      // string | Timestamp | number
  name?: string;
  email?: string;
  region?: string;
  slot?: any;           // string | object
  dateISO?: string;
  start?: string;
  end?: string;
  venueAddress?: string;
  reminderSent?: boolean;
};

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/bookings', { cache: 'no-store' });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      const list: Booking[] = Array.isArray(j.items) ? j.items : [];
      setItems(list);
    } catch (e: any) {
      console.error('Bookings load failed:', e);
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-xs text-slate-500">{items.length} records</p>
        </div>
        <button onClick={load} className="btn btn-ghost">Refresh</button>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading…</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      {!loading && !error && (
        items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700">
                  <th className="px-3 py-2 text-left font-medium">When</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Region</th>
                  <th className="px-3 py-2 text-left font-medium">Slot</th>
                  <th className="px-3 py-2 text-left font-medium">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">{fmtWhen(b.createdAt)}</td>
                    <td className="px-3 py-2">{b.name ?? ''}</td>
                    <td className="px-3 py-2">{b.email ?? ''}</td>
                    <td className="px-3 py-2">{String(b.region ?? '')}</td>
                    <td className="px-3 py-2">{fmtSlot(b.slot, b)}</td>
                    <td className="px-3 py-2">
                      {b.reminderSent
                        ? <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">Sent</span>
                        : <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-600">No bookings yet.</div>
        )
      )}
    </section>
  );
}

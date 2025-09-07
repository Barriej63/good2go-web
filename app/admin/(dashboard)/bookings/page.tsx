'use client';

import { useEffect, useState } from 'react';

type Booking = {
  id: string;
  createdAt?: string;
  name?: string;
  email?: string;
  region?: string;
  slot?: string;
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
      setItems(Array.isArray(j.items) ? j.items : []);
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
                    <td className="px-3 py-2">{b.createdAt || ''}</td>
                    <td className="px-3 py-2">{b.name || ''}</td>
                    <td className="px-3 py-2">{b.email || ''}</td>
                    <td className="px-3 py-2">{b.region || ''}</td>
                    <td className="px-3 py-2">
                      {b.slot || (b.dateISO && b.start ? `${b.dateISO} ${b.start}${b.end ? `–${b.end}`:''}` : '')}
                    </td>
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

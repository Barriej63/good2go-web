'use client';

import { useEffect, useState } from 'react';

type Booking = { id: string; createdAt?: string; name?: string; email?: string; region?: string; slot?: string };

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/admin/bookings');
      const j = await r.json();
      setItems(j.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bookings</h1>
        <span className="text-xs text-slate-500">{items.length} total</span>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : items.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Region</th>
                <th className="px-3 py-2 text-left font-medium">Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{b.createdAt || ''}</td>
                  <td className="px-3 py-2">{b.name || ''}</td>
                  <td className="px-3 py-2">{b.email || ''}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">
                      {b.region || ''}
                    </span>
                  </td>
                  <td className="px-3 py-2">{b.slot || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-slate-600">No bookings yet.</div>
      )}
    </section>
  );
}

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
    <div>
      <h1 className="text-xl font-semibold mb-4">Bookings</h1>
      {loading ? <p>Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Region</th>
                <th className="px-3 py-2 text-left">Slot</th>
              </tr>
            </thead>
            <tbody>
              {items.map(b => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">{b.createdAt || ''}</td>
                  <td className="px-3 py-2">{b.name || ''}</td>
                  <td className="px-3 py-2">{b.email || ''}</td>
                  <td className="px-3 py-2">{b.region || ''}</td>
                  <td className="px-3 py-2">{b.slot || ''}</td>
                </tr>
              ))}
              {!items.length && <tr><td className="px-3 py-4" colSpan={5}>No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


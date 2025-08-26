// app/admin/bookings/page.tsx
'use client';
import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function dollars(cents: number | null) {
  if (cents == null) return '';
  return (cents/100).toFixed(2);
}

export default function AdminBookingsAuto() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';
  const [limit, setLimit] = useState(2000);
  const url = `/api/admin/bookings-feed?limit=${limit}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, { refreshInterval: 15000 });

  useEffect(() => {
    const onFocus = () => mutate();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [mutate]);

  const items = data?.items || [];
  const total = data?.count || 0;

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-3">Admin · Bookings (auto-refresh)</h1>
      <div className="text-sm text-gray-600 mb-4">
        Showing latest <b>{total}</b> bookings. Auto-refresh every 15s.
        <div className="mt-2">
          Limit:&nbsp;
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="border p-1 rounded">
            <option value={200}>200</option>
            <option value={1000}>1,000</option>
            <option value={2000}>2,000</option>
            <option value={5000}>5,000</option>
            <option value={10000}>10,000</option>
          </select>
        </div>
      </div>
      {error && <div className="p-3 mb-4 border rounded bg-red-50 text-red-800">Error loading: {String(error)}</div>}
      {isLoading && <div className="p-3 mb-4 border rounded bg-blue-50 text-blue-800">Loading…</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Region</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Ref</th>
              <th className="text-left p-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b:any) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.createdAt}</td>
                <td className="p-2">{b.date}</td>
                <td className="p-2">{(b.start||'') + (b.end?`–${b.end}`:'')}</td>
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.email}</td>
                <td className="p-2">{b.region}</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2 text-right">${dollars(b.amountCents)}</td>
                <td className="p-2">{b.ref}</td>
                <td className="p-2">{b.id}</td>
              </tr>
            ))}
            {items.length === 0 && !isLoading && (
              <tr><td colSpan={10} className="p-4">No bookings.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

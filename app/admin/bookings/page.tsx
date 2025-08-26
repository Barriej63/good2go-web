// app/admin/bookings/page.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

function dollars(cents: number | null) {
  if (cents == null) return '';
  return (cents/100).toFixed(2);
}

export default function AdminBookingsNoSWR() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const timer = useRef<any>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings-feed?limit=${limit}${token ? `&token=${encodeURIComponent(token)}` : ''}`);
      const j = await res.json();
      if (j.ok) {
        setItems(j.items || []);
        setError(null);
      } else {
        setError(j.error || 'failed');
      }
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    }
  }

  useEffect(() => {
    fetchData();
    timer.current = setInterval(fetchData, 15000);
    return () => clearInterval(timer.current);
  }, [limit]);

  const totalCount = useMemo(() => items.length, [items]);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin · Bookings</h1>
      <p className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-4">
        ⚠️ This page uses token-only access (<code>ADMIN_TOKEN</code>). Add proper auth/roles when convenient.
      </p>

      <div className="text-sm text-gray-600 mb-4 flex items-center gap-4">
        <div>Showing latest <strong>{totalCount}</strong> bookings. Auto-refresh every <strong>15s</strong>.</div>
        <div className="flex items-center gap-2">
          <label>Limit:</label>
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="border p-1 rounded">
            <option value={200}>200</option>
            <option value={1000}>1,000</option>
            <option value={2000}>2,000</option>
            <option value={5000}>5,000</option>
            <option value={10000}>10,000</option>
          </select>
        </div>
        <div className="ml-auto text-gray-700">Last updated: <span className="font-medium">{lastUpdated || '—'}</span></div>
      </div>

      {error && <div className="p-3 mb-4 border rounded bg-red-50 text-red-800">Error: {error}</div>}
      {loading && <div className="p-3 mb-4 border rounded bg-blue-50 text-blue-800">Loading…</div>}

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
            {items.length === 0 && !loading && (
              <tr><td colSpan={10} className="p-4">No bookings.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 text-xs text-gray-500">
        Build timestamp: {new Date().toISOString()}
      </footer>
    </main>
  );
}

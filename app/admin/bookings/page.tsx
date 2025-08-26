// app/admin/bookings/page.tsx
'use client';
import { useMemo, useState } from 'react';

function dollars(cents?: number) {
  if (typeof cents !== 'number') return '';
  return (cents/100).toFixed(2);
}
function clsStatus(s?: string) {
  const v = (s||'').toLowerCase();
  if (v==='paid') return 'bg-green-100 text-green-800';
  if (v==='pending') return 'bg-amber-100 text-amber-800';
  if (v==='failed' || v==='canceled' || v==='cancelled') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

export default function AdminBookings() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState<number>(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [search, setSearch] = useState('');
  const [latest, setLatest] = useState<string>(''); // newest createdAt in list

  async function fetchLatest() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings-feed?limit=${limit}&order=desc${token?`&token=${encodeURIComponent(token)}`:''}`);
      const j = await res.json();
      if (j.ok) {
        setItems(j.items || []);
        setError(undefined);
        setLatest(j.latestCreatedAt || '');
      } else setError(j.error || 'failed');
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchNewOnly() {
    if (!latest) { await fetchLatest(); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings-feed?since=${encodeURIComponent(latest)}&order=asc${token?`&token=${encodeURIComponent(token)}`:''}`);
      const j = await res.json();
      if (j.ok) {
        const newItems = j.items || [];
        if (newItems.length) {
          const newest = newItems[newItems.length-1]?.createdAt || latest;
          setLatest(newest);
          setItems(prev => [...newItems.reverse(), ...prev].slice(0, limit));
        }
        setError(undefined);
      } else setError(j.error || 'failed');
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b:any) => {
      const hay = [b.id,b.ref,b.name,b.email,b.region,b.status,b.date,b.start,b.end].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const exportHref = `/api/admin/bookings-export?limit=${limit}${token?`&token=${encodeURIComponent(token)}`:''}`;

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin · Bookings</h1>
      <p className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-4">
        ⚠️ Token-only access (<code>ADMIN_TOKEN</code>).
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={fetchLatest} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1">Refresh (full latest)</button>
        <button onClick={fetchNewOnly} className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1">Fetch new only</button>
        <a href={exportHref} className="bg-gray-700 hover:bg-gray-800 text-white rounded px-3 py-1">Export CSV</a>

        <div className="ml-4">
          <label className="mr-2 text-sm">Limit:</label>
          <select value={limit} onChange={e=>setLimit(parseInt(e.target.value))} className="border rounded p-1">
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1,000</option>
            <option value={2000}>2,000</option>
          </select>
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="border rounded px-2 py-1 w-64 ml-2" />
      </div>

      {loading && <div className="p-2 bg-blue-50 border border-blue-200 rounded mb-3">Loading…</div>}
      {error && <div className="p-2 bg-red-50 border border-red-200 rounded mb-3">Error: {error}</div>}

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
            {filtered.map((b:any)=> (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.createdAt}</td>
                <td className="p-2">{b.date}</td>
                <td className="p-2">{(b.start||'') + (b.end?`–${b.end}`:'')}</td>
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.email}</td>
                <td className="p-2">{b.region}</td>
                <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${clsStatus(b.status)}`}>{b.status||'—'}</span></td>
                <td className="p-2 text-right">${dollars(b.amountCents)}</td>
                <td className="p-2">{b.ref}</td>
                <td className="p-2">{b.id}</td>
              </tr>
            ))}
            {filtered.length===0 && !loading && (
              <tr><td colSpan={10} className="p-3">No bookings.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-6 text-xs text-gray-500">Build: 2025-08-26T02:51:38.589657Z</footer>
    </main>
  );
}

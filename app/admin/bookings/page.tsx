// app/admin/bookings/page.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

function dollars(cents: number | null) {
  if (cents == null) return '';
  return (cents/100).toFixed(2);
}

function StatusChip({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  let cls = 'bg-gray-200 text-gray-800';
  if (s === 'paid') cls = 'bg-green-100 text-green-800';
  else if (s === 'pending') cls = 'bg-amber-100 text-amber-800';
  else if (s === 'failed' || s === 'cancelled' || s === 'canceled') cls = 'bg-red-100 text-red-800';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{status || '—'}</span>;
}

export default function AdminBookings() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [search, setSearch] = useState('');
  const [recResult, setRecResult] = useState<string>('');
  const [recRunning, setRecRunning] = useState(false);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((b:any) => {
      const hay = [
        b.id, b.ref, b.name, b.email, b.region, b.status, b.date, b.start, b.end
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const totalCount = items.length;
  const showingCount = filtered.length;

  async function reconcile() {
    if (!token) { alert('Missing ADMIN_TOKEN'); return; }
    const lim = prompt('Reconcile latest how many payments? (default 500)', '500') || '500';
    const n = parseInt(lim) || 500;
    setRecRunning(true);
    setRecResult('');
    try {
      const res = await fetch(`/api/admin/reconcile?limit=${n}${token ? `&token=${encodeURIComponent(token)}` : ''}`, { method: 'POST' });
      const j = await res.json();
      if (j.ok) {
        setRecResult(`updated: ${j.updated}, skipped: ${j.skipped}, missingBooking: ${j.missingBooking}, errors: ${j.errors}`);
        fetchData();
      } else {
        setRecResult(`failed: ${j.error || 'unknown error'}`);
      }
    } catch (e:any) {
      setRecResult(`failed: ${String(e)}`);
    } finally {
      setRecRunning(false);
    }
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin · Bookings</h1>
      <p className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-4">
        ⚠️ Token-only access (<code>ADMIN_TOKEN</code>).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="text-sm text-gray-700">
          Showing <strong>{showingCount}</strong> of <strong>{totalCount}</strong> (auto-refresh 15s)
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Limit:</label>
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="border p-1 rounded">
            <option value={200}>200</option>
            <option value={1000}>1,000</option>
            <option value={2000}>2,000</option>
            <option value={5000}>5,000</option>
            <option value={10000}>10,000</option>
          </select>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="border rounded px-2 py-1 w-64"/>
        <button onClick={reconcile} disabled={recRunning} className={`rounded px-3 py-1 text-white ${recRunning ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {recRunning ? 'Reconciling…' : 'Reconcile'}
        </button>
        <div className="text-xs text-gray-600">{recResult}</div>
        <div className="text-sm text-gray-700 ml-auto">Last updated: <span className="font-medium">{lastUpdated || '—'}</span></div>
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
            {filtered.map((b:any) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.createdAt}</td>
                <td className="p-2">{b.date}</td>
                <td className="p-2">{(b.start||'') + (b.end?`–${b.end}`:'')}</td>
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.email}</td>
                <td className="p-2">{b.region}</td>
                <td className="p-2"><StatusChip status={b.status} /></td>
                <td className="p-2 text-right">${dollars(b.amountCents)}</td>
                <td className="p-2">{b.ref}</td>
                <td className="p-2">{b.id}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
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

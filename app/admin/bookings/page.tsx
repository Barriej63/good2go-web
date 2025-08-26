// app/admin/bookings/page.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';

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

type Booking = {
  id: string;
  createdAt?: string;
  date?: string;
  start?: string;
  end?: string;
  name?: string;
  email?: string;
  region?: string;
  status?: string;
  amountCents?: number | null;
  ref?: string;
};

export default function AdminBookingsManual() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = params.get('token') || '';
  const [items, setItems] = useState<Booking[]>([]);
  const [limit, setLimit] = useState(200);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [search, setSearch] = useState('');
  const [since, setSince] = useState<string | null>(null); // latest createdAt we have

  // Initial fetch (newest first)
  async function initialLoad() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings-feed?limit=${limit}&order=desc${token ? `&token=${encodeURIComponent(token)}` : ''}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      const arr: Booking[] = (j.items || []);
      setItems(arr);
      setSince(j.latestCreatedAt || (arr[0]?.createdAt ?? null));
      setError(null);
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    }
  }

  // Manual delta fetch (only newer than 'since')
  async function fetchNew() {
    setLoading(true);
    try {
      const url = `/api/admin/bookings-feed?limit=${limit}&order=asc${since ? `&since=${encodeURIComponent(since)}` : ''}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'failed');
      const newOnes: Booking[] = (j.items || []);
      if (newOnes.length > 0) {
        // append to front (since result is oldest->newest asc)
        const latest = newOnes[newOnes.length - 1].createdAt || since;
        setItems(prev => [...newOnes.reverse(), ...prev]);
        setSince(latest || since);
      }
      setError(null);
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleString());
    }
  }

  useEffect(() => {
    initialLoad();
    // No auto interval: manual-only
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

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin · Bookings</h1>
      <p className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-4">
        ⚠️ Token-only access (<code>ADMIN_TOKEN</code>). Manual refresh only to minimize Firestore reads.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm">Limit per fetch:</label>
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value))} className="border p-1 rounded">
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1,000</option>
          </select>
        </div>
        <button onClick={initialLoad} className="rounded px-3 py-1 bg-gray-700 text-white hover:bg-gray-800">
          Refresh (full latest)
        </button>
        <button onClick={fetchNew} className="rounded px-3 py-1 bg-blue-600 text-white hover:bg-blue-700" title="Fetch only new bookings since your last load">
          Fetch new only
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="border rounded px-2 py-1 w-64"/>
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
                <td className="p-2 text-right">${dollars(b.amountCents ?? null)}</td>
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

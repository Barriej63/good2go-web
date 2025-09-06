// app/admin/bookings/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Booking = {
  id: string;
  createdAt?: string;
  date?: string;
  name?: string;
  email?: string;
  productId?: string;
  status?: string;
};

export default function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/bookings-feed?limit=200', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      setItems(Array.isArray(j?.items) ? j.items : []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = q
    ? items.filter(b =>
        [b.id, b.name, b.email, b.productId, b.date, b.status]
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : items;

  return (
    <main style={{ maxWidth: 1080, margin: '64px auto', padding: 16 }}>
      <h1>Bookings</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Search…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">When</th>
            <th align="left">Date</th>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Product</th>
            <th align="left">Status</th>
            <th align="left">ID</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(b => (
            <tr key={b.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{b.createdAt ?? ''}</td>
              <td>{b.date ?? ''}</td>
              <td>{b.name ?? ''}</td>
              <td>{b.email ?? ''}</td>
              <td>{b.productId ?? ''}</td>
              <td>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: b.status === 'paid' ? '#16a34a22' : b.status === 'pending' ? '#eab30822' : '#9992',
                  border: `1px solid ${b.status === 'paid' ? '#16a34a55' : b.status === 'pending' ? '#eab30855' : '#9995'}`
                }}>
                  {b.status ?? ''}
                </span>
              </td>
              <td>{b.id}</td>
            </tr>
          ))}
          {!filtered.length && (
            <tr><td colSpan={7} style={{ padding: 16, color: '#666' }}>No bookings.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}

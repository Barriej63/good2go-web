'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Booking = {
  id: string;
  createdAt?: string;      // ISO
  name?: string;
  email?: string;
  region?: string;
  slot?: string;           // "YYYY-MM-DD HH:MM–HH:MM"
  venue?: string;
  packageType?: string;    // baseline | package4
};

type AdminConfig = {
  regions?: string[];
  timeslots?: any;
};

/* ---------- styles ---------- */
const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  marginBottom: 24
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

/** Gate using API (client-safe). Returns: 'superadmin' | 'coach' | 'viewer' | null */
function useGate() {
  const [role, setRole] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const r = await fetch('/api/admin/whoami', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (isMounted) setRole(j?.role ?? null);
      } catch {
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setChecked(true);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  return { checked, role };
}

export default function BookingsPage() {
  const { checked, role } = useGate();

  const [regions, setRegions] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, bRes] = await Promise.all([
          fetch('/api/admin/config', { cache: 'no-store' }),
          fetch('/api/admin/bookings?limit=200', { cache: 'no-store' }) // newest first
        ]);
        const cfg: AdminConfig = (await cfgRes.json()) || {};
        const bJson = await bRes.json();
        setRegions(Array.isArray(cfg.regions) ? cfg.regions : []);
        const items: Booking[] = Array.isArray(bJson?.items) ? bJson.items : [];
        setBookings(items);
      } catch (e) {
        console.error('load admin data failed', e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = bookings;
    if (regionFilter !== 'all') {
      list = list.filter(b => (b.region || '').toLowerCase() === regionFilter.toLowerCase());
    }
    if (dateFilter) {
      list = list.filter(b => {
        // accept either b.slot starts with 'YYYY-MM-DD' or createdAt date
        const slotDate = (b.slot || '').slice(0, 10);
        const createdDate = (b.createdAt || '').slice(0, 10);
        return slotDate === dateFilter || createdDate === dateFilter;
      });
    }
    return list;
  }, [bookings, regionFilter, dateFilter]);

  const visible = filtered.slice(0, showCount);

  // While checking, render nothing to avoid flicker
  if (!checked) return null;

  // Not logged in → soft redirect (client-side)
  if (!role) {
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
    return null;
  }

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Bookings</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Newest bookings appear first. Filter by region and date, and load more as needed.
          </p>
        </header>

        {/* Filters */}
        <section style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Region</label>
              <select
                style={inputStyle}
                value={regionFilter}
                onChange={(e) => { setRegionFilter(e.target.value); setShowCount(20); }}
              >
                <option value="all">All regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                style={inputStyle}
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setShowCount(20); }}
              />
            </div>
          </div>
        </section>

        {/* Table */}
        <section style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>When</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Client</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Region</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Slot</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Venue</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Package</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      {b.createdAt || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.region || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.slot || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.venue || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.packageType || '-'}</td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={7} style={{ padding: '14px 12px', color: '#64748b' }}>
                      No bookings match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {visible.length < filtered.length && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowCount((n) => n + 20)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#0284c7',
                  color: '#fff',
                  border: 0,
                  cursor: 'pointer'
                }}
              >
                View more
              </button>
              <span style={{ marginLeft: 12, color: '#64748b', fontSize: 14 }}>
                Showing {visible.length} of {filtered.length}
              </span>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

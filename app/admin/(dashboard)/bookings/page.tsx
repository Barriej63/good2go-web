'use client';

import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number;           // 0..6 (Sun..Sat)
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

type Booking = {
  id: string;
  createdAt?: unknown;
  name?: unknown;
  email?: unknown;
  region?: unknown;
  slot?: unknown;            // may be string or object
  venue?: unknown;
  packageType?: unknown;
};

type AdminConfig = { regions?: string[] };

// ---------- UI constants/styles ----------
const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  marginBottom: 24,
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

// ---------- helpers ----------
const WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function safeText(v: unknown, fallback = '-'): string {
  if (v == null) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // stringify objects/arrays, truncated to avoid huge blobs
  try {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 197) + '…' : s;
  } catch {
    return fallback;
  }
}

function isSlotDef(v: unknown): v is SlotDef {
  return isPlainObject(v) && typeof v.weekday === 'number' && typeof v.start === 'string' && typeof v.end === 'string';
}

function formatSlot(slot: unknown): string {
  if (typeof slot === 'string') return slot;
  if (isSlotDef(slot)) {
    const w = WEEK[slot.weekday] ?? '';
    const range = [slot.start, slot.end].filter(Boolean).join('–');
    const addr = slot.venueAddress ? ` · ${slot.venueAddress}` : '';
    const core = [w, range].filter(Boolean).join(' ');
    return core ? `${core}${addr}` : JSON.stringify(slot);
  }
  return safeText(slot);
}

function slotDateForFilter(slot: unknown): string {
  // only string slots in “YYYY-MM-DD …” format provide a date
  return typeof slot === 'string' ? slot.slice(0, 10) : '';
}

/** Small client gate: calls /api/admin/me; redirects if not allowed. */
function useGate() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/me', { cache: 'no-store' });
        const j = await r.json();
        const ok = Boolean(j?.ok);
        setAllowed(ok);
        if (!ok && typeof window !== 'undefined') window.location.href = '/admin/login';
      } catch {
        setAllowed(false);
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
      }
    })();
  }, []);
  return allowed;
}

// View-model used by the table (strings only)
type UiBooking = {
  id: string;
  createdAtText: string;
  nameText: string;
  emailText: string;
  regionText: string;
  slotText: string;
  venueText: string;
  packageText: string;
  // for filtering
  createdDate: string;
  slotDate: string;
};

export default function BookingsPage() {
  const allowed = useGate();

  const [regions, setRegions] = useState<string[]>([]);
  const [rows, setRows] = useState<UiBooking[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, bRes] = await Promise.all([
          fetch('/api/admin/config', { cache: 'no-store' }),
          fetch('/api/admin/bookings?limit=500', { cache: 'no-store' }), // newest-first per your API
        ]);
        const cfg: AdminConfig = await cfgRes.json().catch(() => ({}));
        setRegions(Array.isArray(cfg?.regions) ? cfg.regions : []);

        const j = await bRes.json().catch(() => ({}));
        const items: Booking[] = Array.isArray(j?.items) ? j.items : [];

        // Normalize everything to safe strings (and keep dates to filter)
        const vm: UiBooking[] = items.map((b): UiBooking => {
          const createdAtStr = safeText(b.createdAt);
          const createdDate = createdAtStr ? createdAtStr.slice(0, 10) : '';
          const slotText = formatSlot(b.slot);
          const venueFromSlot =
            isSlotDef(b.slot) && b.slot.venueAddress ? String(b.slot.venueAddress) : undefined;

          return {
            id: safeText(b.id, Math.random().toString(36).slice(2)),
            createdAtText: createdAtStr || '-',
            nameText: safeText(b.name),
            emailText: safeText(b.email),
            regionText: safeText(b.region),
            slotText,
            venueText: safeText(b.venue ?? venueFromSlot),
            packageText: safeText(b.packageType),
            createdDate,
            slotDate: slotDateForFilter(b.slot),
          };
        });

        setRows(vm);
      } catch (e) {
        console.error('load admin bookings failed', e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (regionFilter !== 'all') {
      const key = regionFilter.toLowerCase();
      list = list.filter(b => b.regionText.toLowerCase() === key);
    }
    if (dateFilter) {
      list = list.filter(b => b.slotDate === dateFilter || b.createdDate === dateFilter);
    }
    return list;
  }, [rows, regionFilter, dateFilter]);

  const visible = filtered.slice(0, showCount);

  if (allowed !== true) return null;

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
                      {b.createdAtText}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.nameText}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.emailText}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.regionText}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.slotText}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.venueText}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{b.packageText}</td>
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

'use client';

import React, { useEffect, useMemo, useState } from 'react';

function useAdminGate() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/whoami', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) setAllowed(true);
        else {
          setAllowed(false);
          if (typeof window !== 'undefined') window.location.href = '/admin/login';
        }
      } catch {
        setAllowed(false);
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
      }
    })();
  }, []);
  return allowed;
}

type AdminUser = {
  id: string;
  email?: string;
  role?: 'superadmin' | 'coach' | 'viewer';
  createdAt?: string | null;
};

const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

export default function UsersPage() {
  const allowed = useAdminGate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');

  // create-user form
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'superadmin' | 'coach' | 'viewer'>('viewer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const j = await r.json();
      const items: AdminUser[] = Array.isArray(j?.items) ? j.items : [];
      setUsers(items);
    } catch (e) {
      console.error('load users failed', e);
    }
  }

  useEffect(() => {
    if (allowed === true) reload();
  }, [allowed]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.error || 'Failed to create user (superadmin only).');
        setBusy(false);
        return;
      }
      setEmail('');
      setRole('viewer');
      await reload();
    } catch {
      setErr('Network error, please try again.');
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  if (allowed !== true) return null;

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>Search users, review roles, and add new admins.</p>
        </header>

        {/* Create user */}
        <section style={card}>
          <form onSubmit={onCreate} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="person@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="viewer">viewer</option>
                  <option value="coach">coach</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
            </div>

            {err && <div style={{ color: '#b91c1c', fontSize: 14 }}>{err}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: busy || !email.trim() ? '#94a3b8' : '#0284c7',
                  color: '#fff',
                  border: 0,
                  cursor: busy || !email.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Adding…' : 'Add user'}
              </button>
            </div>
          </form>
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>
            Only <strong>superadmin</strong> can add users; others will see a “forbidden” message.
          </div>
        </section>

        {/* Search */}
        <section style={card}>
          <label style={labelStyle}>Search</label>
          <input
            style={inputStyle}
            placeholder="Filter by email, role, or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>

        {/* Table */}
        <section style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>User ID</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.role || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace, monospace' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.createdAt || '-'}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: '14px 12px', color: '#64748b' }}>
                      No users match your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

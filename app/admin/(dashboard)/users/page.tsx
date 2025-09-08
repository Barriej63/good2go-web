'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** Small client gate */
function useAdminGate() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [role, setRole] = useState<'superadmin' | 'coach' | 'viewer' | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/me', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) {
          setAllowed(true);
          setRole(j?.role ?? null);
        } else {
          setAllowed(false);
          if (typeof window !== 'undefined') window.location.href = '/admin/login';
        }
      } catch {
        setAllowed(false);
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
      }
    })();
  }, []);

  return { allowed, role };
}

type AdminUser = {
  id: string;
  email?: string;
  role?: 'superadmin' | 'coach' | 'viewer';
  createdAt?: string;
};

const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

export default function UsersPage() {
  const { allowed, role } = useAdminGate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');

  // Add-user form
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<'superadmin' | 'coach' | 'viewer'>('viewer');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
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
    if (allowed === true) refresh();
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: newRole }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.error || 'Failed to add user.');
      } else {
        setEmail('');
        setNewRole('viewer');
        await refresh();
      }
    } catch {
      setErr('Network error, please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (allowed !== true) return null;

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Search users and review their roles.
          </p>
        </header>

        {/* Add user (superadmin only) */}
        {role === 'superadmin' && (
          <section style={card}>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  style={inputStyle}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="viewer">viewer</option>
                  <option value="coach">coach</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
              <div style={{ alignSelf: 'end' }}>
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="btn btn-primary"
                >
                  {busy ? 'Adding…' : 'Add user'}
                </button>
              </div>
            </form>
            {err && <div style={{ marginTop: 8, color: '#b91c1c' }}>{err}</div>}
          </section>
        )}

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

'use client';

import React, { useEffect, useMemo, useState } from 'react';

type AdminUser = {
  id: string;
  email?: string;
  name?: string;
  role?: 'superadmin' | 'coach' | 'viewer';
  createdAt?: string;
};

const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

function useAdminGate() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/whoami', { cache: 'no-store' });
        const j = await r.json();
        setAllowed(!!j?.ok);
        if (!j?.ok && typeof window !== 'undefined') window.location.href = '/admin/login';
      } catch {
        setAllowed(false);
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
      }
    })();
  }, []);
  return allowed;
}

export default function UsersPage() {
  const allowed = useAdminGate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' as 'viewer' | 'coach' | 'superadmin' });
  const [busy, setBusy] = useState(false);

  // load list
  useEffect(() => {
    if (allowed !== true) return;
    (async () => {
      try {
        const r = await fetch('/api/admin/users', { cache: 'no-store' });
        const j = await r.json();
        setUsers(Array.isArray(j?.items) ? j.items : []);
      } catch (e) {
        console.error('load users failed', e);
      }
    })();
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        // reload list
        const r2 = await fetch('/api/admin/users', { cache: 'no-store' });
        const j2 = await r2.json();
        setUsers(Array.isArray(j2?.items) ? j2.items : []);
        setForm({ name: '', email: '', role: 'viewer' });
      }
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
          <p style={{ marginTop: 8, color: '#475569' }}>Add a user by name, email and role. Search below.</p>
        </header>

        {/* Add user */}
        <section style={card}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}>
                <option value="viewer">viewer</option>
                <option value="coach">coach</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button disabled={busy || !form.email.trim()} style={{ padding: '12px 16px', borderRadius: 10, background: '#0284c7', color: '#fff', border: 0, cursor: 'pointer' }}>
                {busy ? 'Adding…' : 'Add user'}
              </button>
            </div>
          </form>
        </section>

        {/* Search */}
        <section style={card}>
          <label style={labelStyle}>Search</label>
          <input
            style={inputStyle}
            placeholder="Filter by name, email, role, or ID…"
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
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>User ID</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.role || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace, monospace' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.createdAt || '-'}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: '14px 12px', color: '#64748b' }}>No users match your query.</td>
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

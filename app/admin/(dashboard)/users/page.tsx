'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** ---- Gate via your REST endpoint (no server-only imports) ---- */
function useAdminGate() {
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

/** ---- Types ---- */
type AdminUser = {
  id: string;
  email?: string;
  role?: 'superadmin' | 'coach' | 'viewer' | string;
  name?: string;
  createdAt?: any; // could be string, Timestamp, {seconds}, etc.
};

/** ---- Safe formatters (prevent React #31 by never returning objects) ---- */
function toISODate(v: any): string {
  try {
    if (!v) return '-';
    // Firestore Timestamp-like
    if (typeof v?.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
    if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000).toISOString().slice(0, 10);
    // Plain string date
    if (typeof v === 'string') {
      // If it already looks like YYYY-MM-DD, keep; else try Date
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      const d = new Date(v);
      if (!isNaN(+d)) return d.toISOString().slice(0, 10);
    }
    return '-';
  } catch { return '-'; }
}

function toText(v: any): string {
  if (v == null) return '-';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return String(v);
  if (typeof v?.toDate === 'function') return toISODate(v);
  if (typeof v?.seconds === 'number') return toISODate(v);
  // Fallback: never render objects directly
  return '-';
}

/** ---- Simple styles (match your admin look) ---- */
const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
  padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24,
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

export default function UsersPage() {
  const allowed = useAdminGate();

  /** Data */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');

  /** Add form */
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'superadmin' | 'coach' | 'viewer'>('viewer');
  const [busyAdd, setBusyAdd] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  useEffect(() => {
    if (allowed !== true) return;
    (async () => {
      try {
        const r = await fetch('/api/admin/users', { cache: 'no-store' });
        const j = await r.json();
        const items: AdminUser[] = Array.isArray(j?.items) ? j.items : (Array.isArray(j?.users) ? j.users : []);
        setUsers(items);
      } catch (e) {
        console.error('load users failed', e);
        setUsers([]);
      }
    })();
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      toText(u.email).toLowerCase().includes(q) ||
      toText(u.role).toLowerCase().includes(q) ||
      toText(u.name).toLowerCase().includes(q) ||
      toText(u.id).toLowerCase().includes(q)
    );
  }, [users, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddErr(null);
    if (!newEmail.trim()) { setAddErr('Email is required'); return; }
    setBusyAdd(true);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          name: newName.trim() || undefined, // optional; backend may ignore
        })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to add user');
      }
      // refresh list
      const rr = await fetch('/api/admin/users', { cache: 'no-store' });
      const jj = await rr.json();
      const items: AdminUser[] = Array.isArray(jj?.items) ? jj.items : (Array.isArray(jj?.users) ? jj.users : []);
      setUsers(items);
      // reset
      setNewName(''); setNewEmail(''); setNewRole('viewer');
    } catch (err: any) {
      setAddErr(err?.message || 'Could not add user');
    } finally {
      setBusyAdd(false);
    }
  }

  if (allowed !== true) return null;

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Add/search users and review their roles. (Name is optional.)
          </p>
        </header>

        {/* Add user */}
        <section style={card}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Name (optional)</label>
              <input style={inputStyle} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={newRole} onChange={e=>setNewRole(e.target.value as any)}>
                <option value="viewer">viewer</option>
                <option value="coach">coach</option>
                <option value="superadmin">superadmin</option>
              </select>
            </div>
            <div style={{ alignSelf: 'end' }}>
              <button
                type="submit"
                disabled={busyAdd || !newEmail.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: busyAdd || !newEmail.trim() ? '#94a3b8' : '#0284c7',
                  color: '#fff', border: 0, cursor: busyAdd || !newEmail.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {busyAdd ? 'Adding…' : 'Add user'}
              </button>
              {addErr && <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 14 }}>{addErr}</div>}
            </div>
          </form>
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
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{toText(u.name)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{toText(u.email)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{toText(u.role)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace,monospace' }}>{toText(u.id)}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{toISODate(u.createdAt)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: '14px 12px', color: '#64748b' }}>
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

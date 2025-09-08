'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** Soft client gate via your whoami endpoint */
function useAdminGate() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/whoami', { cache: 'no-store' });
        const j = await r.json();
        const ok = !!j?.ok;
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

type AdminUser = {
  id: string;
  email?: string;
  role?: 'superadmin' | 'coach' | 'viewer' | string;
  createdAt?: string;          // ISO string
  name?: string | null;        // Optional; older rows may not have it
};

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

export default function UsersPage() {
  const allowed = useAdminGate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');

  // add user form
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'viewer' | 'coach' | 'superadmin'>('viewer');
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!r.ok) { setUsers([]); return; }
      const j = await r.json();
      const items: AdminUser[] = Array.isArray(j?.items) ? j.items : (Array.isArray(j?.users) ? j.users : []);
      setUsers(items.filter(Boolean));
    } catch {
      setUsers([]);
    }
  }

  useEffect(() => {
    if (allowed !== true) return;
    loadUsers();
  }, [allowed]);

  const filtered = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.includes('@')) { alert('Enter a valid email'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          name: newName.trim() || undefined,  // safe if backend not using it yet
        })
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j?.error || 'Failed to add user');
      } else {
        // reload list
        setNewEmail('');
        setNewName('');
        setNewRole('viewer');
        setShowAdd(false);
        await loadUsers();
      }
    } catch (err) {
      alert('Network error while adding user');
    } finally {
      setSaving(false);
    }
  }

  if (allowed !== true) return null;

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>Search users, add new admins/coaches, and review roles.</p>
        </header>

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

        {/* Add user */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Add a user</div>
            <button
              onClick={() => setShowAdd(s => !s)}
              style={{ padding: '8px 12px', borderRadius: 10, background: '#0284c7', color: '#fff', border: 0, cursor: 'pointer' }}
            >
              {showAdd ? 'Close' : 'Add user'}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Name (optional)</label>
                <input
                  style={inputStyle}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
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
                  disabled={saving}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: saving ? '#94a3b8' : '#22c55e',
                    color: '#fff',
                    border: 0,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving…' : 'Create user'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Table */}
        <section style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>User ID</th>
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(filtered) ? filtered : []).map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.role || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace, monospace' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.createdAt || '-'}</td>
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

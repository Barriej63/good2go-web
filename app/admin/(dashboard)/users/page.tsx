'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** Soft gate via your /api/admin/me endpoint */
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
  name?: string;        // optional display name
  createdAt?: string;   // ISO (optional)
};

const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 12, padding: '10px 12px', height: 42, fontSize: 14 };

export default function UsersPage() {
  const { allowed, role } = useAdminGate();
  const canDelete = role === 'superadmin';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      const j = await r.json();
      setUsers(Array.isArray(j?.items) ? j.items : []); // safe guard
    } catch (e) {
      console.error('load users failed', e);
      setUsers([]);
    }
  }

  useEffect(() => {
    if (allowed !== true) return;
    loadUsers();
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

  async function handleDelete(id: string) {
    if (!canDelete) return;
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j?.error || 'Delete failed');
        setDeletingId(null);
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== id)); // optimistic remove
      setDeletingId(null);
    } catch (e) {
      console.error('delete user failed', e);
      alert('Network error deleting user');
      setDeletingId(null);
    }
  }

  if (allowed !== true) return null;

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Search users, view roles, and {canDelete ? 'delete accounts (superadmin only).' : 'view accounts.'}
          </p>
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
                  <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.name || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.email || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.role || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace, monospace' }}>{u.id}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 10,
                            background: deletingId === u.id ? '#94a3b8' : '#ef4444',
                            color: '#fff',
                            border: 0,
                            cursor: deletingId === u.id ? 'not-allowed' : 'pointer'
                          }}
                          title="Delete user"
                        >
                          {deletingId === u.id ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
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

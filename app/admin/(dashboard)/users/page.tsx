'use client';

import { useEffect, useMemo, useState } from 'react';

type Role = 'superadmin' | 'coach' | 'viewer';
type Status = 'active' | 'disabled';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: Status;
  createdAt?: string;
};

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false); // we’ll infer from API failures

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = await r.json();
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e: any) {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addUser() {
    const name = prompt('Name?')?.trim(); if (!name) return;
    const email = prompt('Email?')?.trim()?.toLowerCase(); if (!email) return;
    const role = (prompt('Role (superadmin/coach/viewer)?') || 'viewer').trim().toLowerCase() as Role;

    setBusy('add');
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    setBusy(null);

    if (r.status === 403) {
      alert('Only superadmin can add users.');
      setCanEdit(false);
      return;
    }
    if (!r.ok) {
      alert('Add failed.');
      return;
    }
    await load();
    setCanEdit(true);
  }

  async function updateUser(id: string, patch: Partial<Pick<AdminUser, 'role' | 'status' | 'name'>>) {
    setBusy(`u:${id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setBusy(null);

    if (r.status === 403) {
      alert('Only superadmin can update users.');
      setCanEdit(false);
      return;
    }
    if (!r.ok) {
      alert('Update failed.');
      return;
    }
    await load();
    setCanEdit(true);
  }

  async function removeUser(id: string) {
    if (!confirm('Delete this user?')) return;
    setBusy(`d:${id}`);
    const r = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setBusy(null);

    if (r.status === 403) {
      alert('Only superadmin can delete users.');
      setCanEdit(false);
      return;
    }
    if (!r.ok) {
      alert('Delete failed.');
      return;
    }
    await load();
    setCanEdit(true);
  }

  const total = useMemo(() => items.length, [items]);
  const superadmins = useMemo(() => items.filter(u => u.role === 'superadmin').length, [items]);

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Users & Roles</h1>
          <p className="text-xs text-slate-500">{total} users · {superadmins} superadmin(s)</p>
        </div>

        <div className="flex gap-2">
          <button onClick={load} className="btn btn-ghost">Refresh</button>
          <button onClick={addUser} className="btn btn-primary" disabled={busy==='add'}>
            {busy==='add' ? 'Adding…' : 'Add user'}
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading…</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{u.name || ''}</td>
                  <td className="px-3 py-2">{u.email || ''}</td>
                  <td className="px-3 py-2">
                    <select
                      className="border rounded-lg px-2 py-1"
                      value={u.role}
                      onChange={e => updateUser(u.id, { role: e.target.value as Role })}
                      disabled={busy===`u:${u.id}`}
                    >
                      <option value="viewer">viewer</option>
                      <option value="coach">coach</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="border rounded-lg px-2 py-1"
                      value={u.status || 'active'}
                      onChange={e => updateUser(u.id, { status: e.target.value as Status })}
                      disabled={busy===`u:${u.id}`}
                    >
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{u.createdAt || ''}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-rose-600"
                      onClick={() => removeUser(u.id)}
                      disabled={busy===`d:${u.id}`}
                    >
                      {busy===`d:${u.id}` ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td className="px-3 py-6 text-slate-500 text-center" colSpan={6}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-slate-500 mt-3">
          Tip: only <strong>superadmin</strong> can add/update/delete users. (Viewer/Coach can still see the list.)
        </p>
      )}
    </section>
  );
}

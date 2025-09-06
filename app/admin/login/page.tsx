// app/admin/login/page.tsx
'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        location.href = '/admin';
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.error ?? 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1>Admin Login</h1>
      <p style={{ color: '#555' }}>Enter your admin token to continue.</p>

      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          style={{ width: '100%', padding: 10, fontSize: 16, marginBottom: 12 }}
        />
        <button
          type="submit"
          disabled={busy || !token}
          style={{ padding: '10px 16px', fontSize: 16 }}
        >
          {busy ? 'Checking…' : 'Login'}
        </button>
      </form>

      {msg && <p style={{ color: 'crimson', marginTop: 8 }}>{msg}</p>}
    </main>
  );
}

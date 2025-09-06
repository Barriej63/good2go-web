// app/admin/login/page.tsx
'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
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
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        location.href = '/admin';
      } else {
        setMsg(j?.error ?? 'Login failed');
      }
    } catch (err) {
      setMsg('Network error');
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
          onChange={e => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          style={{ display: 'block', width: '100%', padding: 10, margin: '12px 0' }}
        />
        <button disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {msg && <p style={{ color: 'crimson', marginTop: 12 }}>{String(msg)}</p>}
    </main>
  );
}

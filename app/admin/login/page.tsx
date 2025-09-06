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
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (res.ok) {
      location.href = '/admin';
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j?.error ?? 'Login failed');
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>Admin Login</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        Enter your admin token to continue.
      </p>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            border: '1px solid #ccc', marginBottom: 12,
          }}
        />
        <button
          disabled={busy || !token}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            background: '#0ea35a', color: '#fff', border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {msg && <p style={{ color: '#b00', marginTop: 12 }}>{msg}</p>}
    </main>
  );
}

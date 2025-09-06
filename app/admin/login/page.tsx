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
      <p style={{ color: '#555', marginBottom: 24 }}>Enter your admin token to continue.</p>

      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 16,
            border: '1px solid #ddd',
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
        <button
          type="submit"
          disabled={busy || !token}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 16,
            borderRadius: 8,
            background: busy ? '#9ca3af' : '#16a34a',
            color: '#fff',
            border: 0,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {msg && (
        <p style={{ color: '#b91c1c', marginTop: 12 }}>
          {String(msg)}
        </p>
      )}
    </main>
  );
}

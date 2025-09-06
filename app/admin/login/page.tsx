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
    <main style={{ maxWidth: 420, margin: '64px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 8 }}>Admin Login</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Enter your admin token to continue.</p>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          style={{ width: '100%', padding: 10, marginBottom: 12, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button
          disabled={busy}
          type="submit"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 6,
            background: '#16a34a',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {msg && <p style={{ color: 'crimson', marginTop: 12 }}>{msg}</p>}
      </form>
    </main>
  );
}

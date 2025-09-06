'use client';

import { useState } from 'react';

export const metadata = { title: 'Admin Login — Good2Go' };

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        // go to the bookings admin page
        window.location.href = '/admin/bookings';
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
      <h1 style={{ marginTop: 0 }}>Admin Login</h1>
      <p style={{ color: '#64748b' }}>
        Enter your one-time admin token. A secure cookie is set for subsequent requests.
      </p>
      <form onSubmit={submit}>
        <input
          type="password"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
        />
        <button
          type="submit"
          disabled={busy || !token}
          style={{
            marginTop: 12, width: '100%', padding: 12, borderRadius: 10,
            background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {err && <p style={{ color: '#b91c1c', marginTop: 10 }}>{err}</p>}
      </form>
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 16 }}>
        Tip: On a trusted device, you can also visit <code>/admin?token=YOUR_TOKEN</code> once—this sets the cookie and removes the token from the URL.
      </p>
    </main>
  );
}

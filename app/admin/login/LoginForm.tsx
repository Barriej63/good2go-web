'use client';

import { useState } from 'react';

export default function LoginForm() {
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
  );
}

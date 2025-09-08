// /app/admin/login/SignInCard.tsx  (CLIENT COMPONENT)
'use client';

import React, { useState } from 'react';

export default function SignInCard() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.error || 'Sign-in failed. Check your token.');
        setBusy(false);
        return;
      }
      window.location.href = '/admin';
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <label style={{ fontWeight: 600, color: '#334155' }}>Enter token</label>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your admin token"
        style={{
          width: '100%',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          padding: '12px 14px',
          height: 46,
          fontSize: 16,
        }}
        autoFocus
      />
      {err && <div style={{ color: '#b91c1c', fontSize: 14 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          type="submit"
          disabled={busy || !token.trim()}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: busy || !token.trim() ? '#94a3b8' : '#0284c7',
            color: '#fff',
            border: 0,
            cursor: busy || !token.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a
          href="/"
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            textDecoration: 'none',
          }}
        >
          Back to site
        </a>
      </div>
    </form>
  );
}

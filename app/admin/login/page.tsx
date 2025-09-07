'use client';

import { redirect } from 'next/navigation';
import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';

// This page is mostly server-rendered for fast gating,
// with a tiny client form for the POST to /api/admin/login
function styles() {
  const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
  const mainWrap: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '48px 20px 96px' };
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 2px rgba(0,0,0,.04)'
  };
  const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' };
  const sub: React.CSSProperties = { marginTop: 8, color: '#475569' };
  return { pageWrap, mainWrap, card, title, sub };
}

export default async function AdminLoginPage() {
  const ok = await isAdminCookie();
  const role = ok ? await getAdminRole() : null;
  const { pageWrap, mainWrap, card, title, sub } = styles();

  // If already signed in, show a small card with actions
  if (ok && role) {
    return (
      <div style={pageWrap}>
        <main style={mainWrap}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={title}>Admin</h1>
            <p style={sub}>You’re already signed in as <strong>{role}</strong>.</p>
          </header>

          <section style={card}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/admin"
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: '#0284c7',
                  color: '#fff',
                  textDecoration: 'none'
                }}
              >
                Go to dashboard
              </a>
              <form
                action="/api/admin/logout"
                method="POST"
                style={{ margin: 0 }}
              >
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Otherwise show the sign-in card
  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={title}>Admin Login</h1>
          <p style={sub}>Enter your one-time admin token.</p>
        </header>

        <section style={card}>
          <SignInCard />
        </section>
      </main>
    </div>
  );
}

/** ---------- Client form ---------- */
'use client';
import React, { useState } from 'react';

function SignInCard() {
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
        body: JSON.stringify({ token: token.trim() })
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
          fontSize: 16
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
            cursor: busy || !token.trim() ? 'not-allowed' : 'pointer'
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
            textDecoration: 'none'
          }}
        >
          Back to site
        </a>
      </div>
    </form>
  );
}


'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.redirected) {
      // server will 303 -> /admin on success
      window.location.href = res.url;
      return;
    }
    const j = await res.json().catch(() => null);
    setError(j?.error || 'Login failed');
    setLoading(false);
  };

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Admin Login</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="token">Admin Token</label>
        <input
          id="token"
          name="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter ADMIN_TOKEN"
          autoComplete="current-password"
          style={{ width: '100%', padding: 8, marginTop: 8, marginBottom: 12 }}
        />
        <button disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  );
}

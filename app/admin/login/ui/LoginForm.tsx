'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErr('');
    const token = String(new FormData(e.currentTarget).get('token') || '');
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!r.ok) { setBusy(false); setErr('Invalid token. Try again.'); return; }
    window.location.href = '/admin';
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        name="token"
        type="password"
        placeholder="Enter token"
        className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/" className="btn btn-ghost">Back to site</a>
      </div>
      {err && <p className="text-rose-600 text-sm">{err}</p>}
    </form>
  );
}

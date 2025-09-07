// app/admin/login/page.tsx
'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [status, setStatus] = useState<'idle' | 'busy' | 'err'>('idle');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('busy');
    const token = String(new FormData(e.currentTarget).get('token') || '');
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!r.ok) { setStatus('err'); return; }
    window.location.href = '/admin';
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
        <p className="text-sm text-slate-600 mb-4">Enter your one-time admin token.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            name="token"
            type="password"
            placeholder="Enter token"
            className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <div className="flex gap-3">
            <button type="submit" disabled={status==='busy'} className="btn btn-primary">
              {status==='busy' ? 'Signing in…' : 'Sign in'}
            </button>
            <a href="/" className="btn btn-ghost">Back to site</a>
          </div>
          {status==='err' && <p className="text-rose-600 text-sm">Invalid token. Try again.</p>}
        </form>
      </div>
    </main>
  );
}


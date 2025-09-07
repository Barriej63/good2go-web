'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [status, setStatus] = useState<'idle'|'busy'|'err'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="token" type="password" placeholder="Enter token" className="border rounded w-full p-2" />
        <button type="submit" disabled={status==='busy'} className="rounded px-4 py-2 border">
          {status==='busy' ? 'Signing in…' : 'Sign in'}
        </button>
        {status==='err' && <p className="text-red-600">Invalid token</p>}
      </form>
    </main>
  );
}

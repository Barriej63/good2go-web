'use client';

import { useEffect, useState } from 'react';

export default function AdminLogin() {
  const [status, setStatus] = useState<'idle'|'busy'|'err'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = (new FormData(e.currentTarget).get('token') as string) || '';
    setStatus('busy');
    const r = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      window.location.href = '/admin';
    } else {
      setStatus('err');
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="token"
          type="password"
          placeholder="Enter ADMIN_TOKEN"
          className="border rounded w-full p-2"
        />
        <button
          type="submit"
          className="rounded px-4 py-2 border"
          disabled={status==='busy'}
        >
          {status==='busy' ? 'Signing in…' : 'Sign in'}
        </button>
        {status==='err' && <p className="text-red-600">Invalid token</p>}
      </form>
    </main>
  );
}

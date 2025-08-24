'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RedirectToWorldline() {
  const params = useSearchParams();
  const [status, setStatus] = useState('Preparing payment…');
  const [err, setErr] = useState('');

  useEffect(() => {
    const ref = params.get('ref');
    const amountStr = params.get('amount');
    if (!ref || !amountStr) {
      setErr('Missing booking reference or amount.');
      return;
    }
    const amount = parseInt(amountStr, 10) || 0;
    (async () => {
      try {
        setStatus('Creating Worldline session…');
        const qs = new URLSearchParams({ ref, amount: String(amount) }).toString();
        const r = await fetch(`/api/worldline/create?${qs}`, { method: 'GET' });
        const data = await r.json();
        if (!r.ok || !data?.ok || !data?.redirectUrl) {
          throw new Error(data?.error || 'No redirectUrl from gateway');
        }
        setStatus('Redirecting…');
        window.location.assign(data.redirectUrl);
      } catch (e) {
        console.error(e);
        setErr(e.message || 'Failed to start payment');
      }
    })();
  }, [params]);

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Connecting to Payment…</h1>
      {!err ? <p>{status}</p> : <p className="text-red-600">{err}</p>}
    </main>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PayRedirect() {
  const sp = useSearchParams();
  const ref = sp.get('ref') || '';
  const amount = sp.get('amount') || '';
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!ref || !amount) { setErr('Missing ref or amount.'); return; }
      try {
        const qs = new URLSearchParams({ ref, amount }).toString();
        const r = await fetch(`/api/worldline/create?${qs}`);
        const data = await r.json().catch(() => ({}));
        if (!mounted) return;
        if (data?.ok && data?.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          console.error('worldline/create failed', data);
          setErr('Could not start payment. See DevTools → Network → worldline/create.');
        }
      } catch (e) {
        console.error('worldline/create fetch error', e);
        setErr('Network error starting payment.');
      }
    }
    run();
    return () => { mounted = false; };
  }, [ref, amount]);

  return (
    <main style={{maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial'}}>
      <h1>Starting payment…</h1>
      <p>Ref: <code>{ref}</code></p>
      <p>Amount (cents): <code>{amount}</code></p>
      {err && <p style={{color:'#b91c1c', marginTop:12}}>{err}</p>}
      <div style={{marginTop: 24, fontSize: 12, color: '#64748b'}}>build: pay-redirect • 2025-08-25</div>
    </main>
  );
}


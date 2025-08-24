// app/pay/redirect/page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PayRedirect() {
  const sp = useSearchParams();
  const ref = sp.get('ref') || '';
  const amount = sp.get('amount') || '';
  const [err, setErr] = useState('');
  const [debug, setDebug] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!ref || !amount) { setErr('Missing ref or amount'); return; }
      const q = new URLSearchParams({ ref, amount }).toString();
      const r = await fetch(`/api/worldline/create?${q}`);
      let data = {};
      try { data = await r.json(); } catch {}
      if (!mounted) return;
      setDebug({ status: r.status, data });
      if (r.ok && data?.ok && data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setErr('Could not get Worldline redirect. See console → Network → worldline/create.');
      }
    }
    run();
    return () => { mounted = false; };
  }, [ref, amount]);

  return (
    <main style={{maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui'}}>
      <h1>Redirecting to payment…</h1>
      <p>Booking: <code>{ref}</code>, Amount (cents): <code>{amount}</code></p>
      {err && <p style={{color:'#b91c1c'}}>{err}</p>}
      {debug && (
        <details style={{marginTop:12}}>
          <summary>Diagnostics</summary>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(debug, null, 2)}</pre>
          <p style={{fontSize:12, color:'#64748b'}}>build: wprequest-server • 2025-08-24</p>
        </details>
      )}
    </main>
  );
}

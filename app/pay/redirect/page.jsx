// app/pay/redirect/page.jsx
'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useState } from 'react';

export default function PayRedirectPage() {
  const [msg, setMsg] = useState('Preparing payment…');

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    const amt = url.searchParams.get('amount');

    const go = async () => {
      if (!ref || !amt) {
        setMsg('Missing booking reference or amount.');
        return;
      }
      try {
        const r = await fetch('/api/worldline/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref, amount: Number(amt) }),
        });
        const json = await r.json();
        if (!r.ok || !json?.ok || !json?.redirectUrl) {
          console.error('worldline create failed', json);
          setMsg('Could not start payment. (create failed)');
          return;
        }
        window.location.replace(json.redirectUrl);
      } catch (err) {
        console.error(err);
        setMsg('Could not start payment (network).');
      }
    };
    go();
  }, []);

  return (
    <div style={{maxWidth:720,margin:'3rem auto',fontSize:18,lineHeight:1.6}}>
      <h1>Connecting to Payment…</h1>
      <p>{msg}</p>
      <p>If you are not redirected automatically, please try again.</p>
    </div>
  );
}

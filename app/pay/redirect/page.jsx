'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// Do not pre-render this page; it reads search params at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PayRedirectPage() {
  const search = useSearchParams();

  useEffect(() => {
    const ref = search.get('ref');
    const amount = search.get('amount'); // cents string

    if (!ref || !amount) {
      window.location.replace('/book?err=missing_params');
      return;
    }

    (async () => {
      try {
        const qs = new URLSearchParams({ ref, amount }).toString();
        const res = await fetch(`/api/worldline/create?${qs}`, { method: 'GET', cache: 'no-store' });
        let json = {};
        try { json = await res.json(); } catch {}
        if (res.ok && json && json.redirectUrl) {
          window.location.href = json.redirectUrl;
        } else {
          const msg = (json && (json.error || json.detail)) || 'Could not start payment (no redirectUrl).';
          alert(msg);
          window.location.replace(`/book?err=${encodeURIComponent(msg)}&ref=${encodeURIComponent(ref)}`);
        }
      } catch (e) {
        alert('Network error starting payment. Please try again.');
        window.location.replace(`/book?err=net&ref=${encodeURIComponent(search.get('ref') || '')}`);
      }
    })();
  }, [search]);

  return (
    <main style={{maxWidth: 720, margin: '4rem auto', fontFamily: 'system-ui, sans-serif'}}>
      <h1>Connecting to Payment…</h1>
      <p>Please wait, do not close this window.</p>
    </main>
  );
}

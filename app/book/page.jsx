'use client';

import { useState } from 'react';

export default function BookPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isPackage, setIsPackage] = useState(false);
  const [region, setRegion] = useState('Auckland');
  const [slot, setSlot] = useState('2025-08-26T17:30:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        clientName: name,
        clientEmail: email,
        region,
        slot,
        product: isPackage ? 'package' : 'baseline',
        consentAccepted: true
      };

      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await r.json();
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || 'Could not create booking');
      }

      const amount = isPackage ? 19900 : 6500; // cents
      const href = `/pay/redirect?ref=${encodeURIComponent(data.bookingRef)}&amount=${amount}`;
      // send the customer to the redirect helper page (which then calls Worldline)
      window.location.assign(href);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Test Booking (demo)</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <div>Client name</div>
          <input className="border p-2 w-full" value={name} onChange={e=>setName(e.target.value)} />
        </label>
        <label className="block">
          <div>Email</div>
          <input className="border p-2 w-full" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label className="block">
          <div>Product</div>
          <select className="border p-2 w-full" value={isPackage ? 'package' : 'baseline'} onChange={e=>setIsPackage(e.target.value === 'package')}>
            <option value="baseline">Baseline — $65</option>
            <option value="package">Package (4 sessions) — $199</option>
          </select>
        </label>
        <button disabled={busy} className="bg-black text-white px-4 py-2 rounded">
          {busy ? 'Working…' : 'Proceed'}
        </button>
      </form>
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </main>
  );
}

'use client';
import React, { useState } from 'react';
import { PRODUCTS, centsFor } from '../../lib/pricing';

export default function BookingPage() {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setMessage('');
    setProcessing(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name') || '',
      email: fd.get('email') || '',
      phone: fd.get('phone') || '',
      region: fd.get('region') || '',
      slot: fd.get('slot') || '',
      venue: fd.get('venue') || '',
      referringName: fd.get('referringName') || '',
      referringEmail: fd.get('referringEmail') || '',
      consentAccepted: fd.get('consent') === 'on',
      product: (fd.get('product') || 'baseline')
    };
    try {
      const r = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Booking failed');
      const bookingRef = data.bookingRef;
      const cents = centsFor(payload.product);
      window.location.href = `/pay/redirect?ref=${encodeURIComponent(bookingRef)}&amount=${cents}`;
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not create booking');
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Book a Good2Go Assessment</h1>
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="region" placeholder="Region" className="border rounded p-2" required />
          <input name="slot" placeholder="Date & Time" className="border rounded p-2" required />
          <input name="venue" placeholder="Venue" className="border rounded p-2" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input name="name" placeholder="Your Full Name" className="border rounded p-2" required />
          <input name="email" type="email" placeholder="Your Email" className="border rounded p-2" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input name="referringName" placeholder="Medical Professional Name (optional)" className="border rounded p-2" />
          <input name="referringEmail" type="email" placeholder="Medical Professional Email (optional)" className="border rounded p-2" />
        </div>
        <fieldset className="border rounded p-3">
          <legend className="px-1 text-sm font-medium">Select Product</legend>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="product" value="baseline" defaultChecked />
            <span>Baseline — ${(PRODUCTS.baseline.cents/100).toFixed(2)}</span>
          </label>
          <label className="flex items-center gap-2 py-1">
            <input type="radio" name="product" value="package4" />
            <span>Package (4 weekly sessions) — ${(PRODUCTS.package4.cents/100).toFixed(2)}</span>
          </label>
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="consent" required />
          <span>I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>
        <button type="submit" disabled={processing} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
          {processing ? 'Processing…' : 'Proceed'}
        </button>
        {message && <p className="text-red-600 text-sm">{message}</p>}
      </form>
    </div>
  );
}

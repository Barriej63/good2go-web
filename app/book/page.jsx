'use client';
import React, { useState } from 'react';
import ConsentBlock from '@/components/ConsentBlock';

export default function BookPage() {
  const [consent, setConsent] = useState({ accepted: false, name: '', signatureDataUrl: '', consentVersion: '' });
  const [loading, setLoading] = useState(false);
  const canContinue = consent.accepted && consent.name.trim().length >= 2;

  async function handleContinue(e) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);

    // If your flow already has a bid, pull it from the URL (?bid=...)
    const bid = (typeof window !== 'undefined') ? new URLSearchParams(location.search).get('bid') : null;

    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, consent })
      });
    } catch (e) {
      console.error('Consent store failed (continuing):', e);
    }

    // TODO: replace with your existing booking/payment redirect
    // e.g., await createBookingAndRedirectToPayment({ ...formValues, consentAccepted: true });
    alert('Proceed to payment wiring here');
    setLoading(false);
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/* TODO: Keep/restore your existing booking form fields here */}

      <ConsentBlock onChange={setConsent} />

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
      {!canContinue && (
        <p className="text-sm text-red-600 mt-2">Please tick the consent box and enter your full name to continue.</p>
      )}
    </main>
  );
}

'use client';
import React, { useState } from 'react';
import ConsentBlock from '@/components/ConsentBlock';

export default function BookPage() {
  const [consent, setConsent] = useState({ accepted: false, name: '', signatureDataUrl: '', consentVersion: '' });
  const [loading, setLoading] = useState(false);
  const canContinue = consent.accepted && consent.name.trim().length >= 2;

  function getBidFromUrl() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('bid') || params.get('ref') || null;
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);

    const bid = getBidFromUrl();

    // Best-effort: store consent before redirecting
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, consent }),
      });
    } catch (err) {
      console.error('Consent save failed (continuing to payment):', err);
    }

    // Obtain the redirectUrl using your existing logic.
    // Path A: some projects expose a helper on window
    let redirectUrl = null;
    try {
      if (typeof window !== 'undefined' && typeof window.createBookingAndGetRedirectUrl === 'function') {
        const res = await window.createBookingAndGetRedirectUrl({ consentAccepted: true, consentName: consent.name });
        redirectUrl = res?.redirectUrl || null;
      }
    } catch (err) {
      console.error('Helper redirect failed, falling back to API...', err);
    }

    // Path B: fallback to calling your booking API which should return { redirectUrl }
    if (!redirectUrl) {
      try {
        const r = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentAccepted: true, consentName: consent.name }),
        });
        const data = await r.json();
        redirectUrl = data?.redirectUrl || null;
      } catch (err) {
        console.error('API redirect fetch failed:', err);
      }
    }

    if (!redirectUrl) {
      setLoading(false);
      alert('Could not get payment link. Please try again or contact support.');
      return;
    }

    // Your project uses this exact pattern:
    window.location.href = redirectUrl;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/* Your existing booking fields remain above the consent block. */}

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
        <p className="text-sm text-red-600 mt-2">
          Please tick the consent box and enter your full name to continue.
        </p>
      )}
    </main>
  );
}

'use client';
import React, { useState } from 'react';
import ConsentBlock from '@/components/ConsentBlock';

// ---- Helper: adapt this to YOUR existing booking/payment call ----
// Priority order:
// 1) If you already expose window.createBookingAndGetRedirectUrl(formValues),
//    we'll call that and use its { redirectUrl } result.
// 2) Else we'll POST to /api/book with minimal payload and expect { redirectUrl }.
//    If your endpoint is different, change BOOK_API_PATH below.

const BOOK_API_PATH = '/api/book';

async function getRedirectUrl(formValues) {
  // Option 1: use your existing global helper if available
  if (typeof window !== 'undefined' && typeof window.createBookingAndGetRedirectUrl === 'function') {
    const res = await window.createBookingAndGetRedirectUrl(formValues);
    const url = res?.redirectUrl || res?.paymentUrl || res?.url;
    if (!url) throw new Error('createBookingAndGetRedirectUrl() did not return redirectUrl');
    return url;
  }

  // Option 2: call your API directly (default: /api/book)
  const r = await fetch(BOOK_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formValues || {}),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Booking API failed (${r.status}): ${txt}`);
  }
  const data = await r.json();
  const url = data?.redirectUrl || data?.paymentUrl || data?.url;
  if (!url) throw new Error('Booking API did not return redirectUrl');
  return url;
}

export default function BookPage() {
  // Minimal local state for consent gating
  const [consent, setConsent] = useState({ accepted: false, name: '', signatureDataUrl: '', consentVersion: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canContinue = consent.accepted && consent.name.trim().length >= 2;

  // TODO: Replace these placeholders with your real booking form values.
  // If you already have state for region/slot/customer, merge it here.
  function collectFormValues() {
    // Pull from existing inputs if needed
    const usp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const bid = usp.get('bid'); // optional, if already known
    return {
      // ---- Replace with your real fields ----
      region: (document.getElementById('region')?.value || usp.get('region') || '').trim(),
      slot: (document.getElementById('slot')?.value || usp.get('slot') || '').trim(),
      name: (document.getElementById('fullName')?.value || '').trim(),
      email: (document.getElementById('email')?.value || '').trim(),
      // ---------------------------------------
      consentAccepted: true,
      bid,
    };
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);
    setError('');

    const usp = new URLSearchParams(window.location.search);
    const bid = usp.get('bid');

    // Best-effort: store consent before redirect
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, consent }),
      });
    } catch (e) {
      console.warn('Consent save failed (continuing):', e);
    }

    try {
      const formValues = collectFormValues();
      const redirectUrl = await getRedirectUrl(formValues);
      window.location.href = redirectUrl; // <-- your actual redirect
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to start payment');
      setLoading(false);
    }
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/*
        Your existing booking form stays here.
        If you want this page to read values automatically, give inputs these ids:
          - region (select/text)
          - slot (select/text)
          - fullName (text)
          - email (email)
      */}

      <ConsentBlock onChange={setConsent} />

      <div className="mt-6 flex gap-3 items-center">
        <button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {loading ? 'Processing…' : 'Continue to Payment'}
        </button>
        {!canContinue && <span className="text-sm text-gray-600">Tick consent and enter full name to continue.</span>}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}

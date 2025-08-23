'use client';
import React, { useState, useEffect } from 'react';

/**
 * build: app/booking/page.jsx • consent-inline fix
 * This page inlines the consent UI and finishes with window.location.href = redirectUrl.
 * It posts to /api/consent (best-effort) before redirecting.
 */

function ConsentInline({ onChange }) {
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    onChange?.({ accepted, name: name.trim(), consentVersion: '2025-08-23' });
  }, [accepted, name]);

  return (
    <section className="mt-8 p-5 border rounded-2xl bg-white">
      <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
        <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
        <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
      </ul>
      <p className="text-sm text-gray-600 mt-2">
        Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025-08-23
      </p>

      <label className="flex items-start gap-3 mt-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
      </label>

      <div className="mt-4">
        <label className="block text-sm font-medium">Full Name (type to sign)</label>
        <input
          type="text"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full legal name"
        />
      </div>
    </section>
  );
}

export default function BookingPage() {
  const [consent, setConsent] = useState({ accepted: false, name: '', consentVersion: '2025-08-23' });
  const [loading, setLoading] = useState(false);
  const canContinue = consent.accepted && consent.name.trim().length >= 2;

  async function handleContinue(e) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);

    // Attach bid if present in the URL
    const params = typeof window !== 'undefined' ? new URLSearchParams(location.search) : null;
    const bid = params?.get('bid') || null;

    // Best-effort: store consent before redirect
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, consent })
      });
    } catch (err) {
      console.error('Consent store failed (continuing):', err);
    }

    // Get payment URL from your existing API
    let redirectUrl = null;
    try {
      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentAccepted: true })
      });
      const data = await r.json();
      redirectUrl = data.redirectUrl || data.paymentUrl || data.url || null;
    } catch (err) {
      console.error('Booking API failed:', err);
    }

    if (!redirectUrl) {
      alert('Could not get payment URL. Please try again.');
      setLoading(false);
      return;
    }

    // Final step: go to HPP
    window.location.href = redirectUrl;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">build: app/booking/page.jsx • consent-inline fix</div>
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/* Your existing booking form fields remain here */}

      <ConsentInline onChange={setConsent} />

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue || loading}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {loading ? 'Processing…' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
      {!canContinue && (
        <p className="text-sm text-red-600 mt-2">Please tick the consent box and enter your full name to continue.</p>
      )}
    </main>
  );
}

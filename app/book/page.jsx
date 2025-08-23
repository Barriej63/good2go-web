'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_VERSION = '2025-08-23';
const CONSENT_SUMMARY = [
  'I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.',
  'I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.',
  'I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.'
];

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let rect = canvas.getBoundingClientRect();

    const pos = (e) => {
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    };

    const onDown = (e) => {
      e.preventDefault();
      setDrawing(true);
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e) => {
      if (!drawing) return;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => {
      setDrawing(false);
      const dataUrl = canvas.toDataURL('image/png');
      onChange?.(dataUrl);
    };
    const onResize = () => { rect = canvas.getBoundingClientRect(); };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('resize', onResize);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, [drawing]);
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange?.('');
  };
  return (
    <div className="mt-1 border rounded-xl p-2">
      <canvas ref={canvasRef} width={500} height={140} className="w-full h-[140px] bg-gray-50 rounded-lg" />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={clear} className="px-3 py-1 rounded-lg border">Clear</button>
      </div>
    </div>
  );
}

export default function BookPage() {
  const [accepted, setAccepted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [sig, setSig] = useState('');
  const [loading, setLoading] = useState(false);
  const canContinue = accepted && fullName.trim().length >= 2;

  async function saveConsent() {
    const bid = (typeof window !== 'undefined') ? new URLSearchParams(location.search).get('bid') : null;
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid,
          consent: {
            accepted,
            name: fullName.trim(),
            signatureDataUrl: sig || null,
            consentVersion: CONSENT_VERSION
          }
        })
      });
    } catch (e) {
      console.error('Consent save failed (continuing):', e);
    }
  }

  async function getRedirectUrlMin() {
    // If your existing global helper exists, use it; else call /api/book
    if (typeof window !== 'undefined' && typeof window.createBookingAndGetRedirectUrl === 'function') {
      const res = await window.createBookingAndGetRedirectUrl({ fullName });
      return res?.redirectUrl || res?.paymentUrl || res?.url || null;
    }
    const r = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName })
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.redirectUrl || data?.paymentUrl || data?.url || null;
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);
    await saveConsent();
    // get URL using your existing path
    const redirectUrl = await getRedirectUrlMin();
    if (!redirectUrl) {
      alert('Could not get payment link. Please try again.');
      setLoading(false);
      return;
    }
    window.location.href = redirectUrl;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/* DEBUG tag to verify this file is live */}
      <div className="mb-4 inline-flex items-center gap-2 text-xs bg-gray-100 px-2 py-1 rounded">
        <span>Consent inline build</span>
        <code>v0823-inline</code>
      </div>

      {/* CONSENT SHORT FORM */}
      <section className="mt-4 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {CONSENT_SUMMARY.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Read the full agreement at <Link href="/consent" className="underline">/consent</Link>. Version: {CONSENT_VERSION}
        </p>

        <label className="flex items-start gap-3 mt-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} />
          <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Full Name (type to sign)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={fullName}
              onChange={(e)=>setFullName(e.target.value)}
              placeholder="Your full legal name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Signature (optional)</label>
            <SignaturePad onChange={setSig} />
          </div>
        </div>
      </section>

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

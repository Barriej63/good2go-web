'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';

type ConsentState = {
  accepted: boolean;
  name: string;
  signatureDataUrl?: string | null;
  consentVersion: string;
};

const CONSENT_VERSION = '2025-08-23';
const CONSENT_SUMMARY: string[] = [
  'I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.',
  'I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.',
  'I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.',
];

export default function BookPage() {
  const [accepted, setAccepted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canContinue = accepted && fullName.trim().length >= 2;

  // Simple signature capture
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let rect = canvas.getBoundingClientRect();

    const pos = (e: MouseEvent | TouchEvent) => {
      const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onDown = (e: any) => {
      e.preventDefault();
      drawingRef.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const onMove = (e: any) => {
      if (!drawingRef.current) return;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const onUp = () => {
      drawingRef.current = false;
      setSigUrl(canvas.toDataURL('image/png'));
    };
    const onResize = () => {
      rect = canvas.getBoundingClientRect();
    };

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
      canvas.removeEventListener('touchstart', onDown as any);
      canvas.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const consent: ConsentState = useMemo(() => ({
    accepted,
    name: fullName.trim(),
    signatureDataUrl: sigUrl,
    consentVersion: CONSENT_VERSION
  }), [accepted, fullName, sigUrl]);

  async function handleContinue(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);

    // Attach consent first (best-effort)
    try {
      const bid = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('bid') : null;
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid, consent })
      });
    } catch (_) { /* continue */ }

    // Request payment redirect URL from your existing API
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentAccepted: true, consentName: consent.name })
      });
      const data = await res.json();
      const redirectUrl: string | undefined = (data && (data.redirectUrl || data.paymentUrl || data.url));
      if (!redirectUrl) throw new Error('Missing redirectUrl from /api/book');
      window.location.href = redirectUrl;
      return;
    } catch (err) {
      console.error(err);
      alert('Sorry, we could not start the payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function clearSig() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigUrl(null);
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • consent-ts inline</div>
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">
        Select your region and preferred slot, then confirm consent to continue to payment.
      </p>

      {/* Your existing booking inputs go above this section */}

      <section className="mt-8 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {CONSENT_SUMMARY.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Read the full agreement at <a className="underline" href="/consent">/consent</a>. Version: {CONSENT_VERSION}
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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Full Name (type to sign)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full legal name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Signature (optional)</label>
            <div className="mt-1 border rounded-xl p-2">
              <canvas ref={canvasRef} width={500} height={140} className="w-full h-[140px] bg-gray-50 rounded-lg" />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={clearSig} className="px-3 py-1 rounded-lg border">Clear</button>
                {sigUrl && <span className="text-xs text-gray-500">Signature captured</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

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

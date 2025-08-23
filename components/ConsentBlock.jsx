'use client';
import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { CONSENT_SUMMARY, CONSENT_VERSION } from '@/content/consentText';

export default function ConsentBlock({ onChange, initial = {} }) {
  const [accepted, setAccepted] = useState(!!initial.accepted);
  const [name, setName] = useState(initial.name || '');
  const [sigDataUrl, setSigDataUrl] = useState(initial.signatureDataUrl || '');
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    onChange?.({ accepted, name: name.trim(), signatureDataUrl: sigDataUrl, consentVersion: CONSENT_VERSION });
  }, [accepted, name, sigDataUrl]);

  // Simple signature capture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    let rect = canvas.getBoundingClientRect();

    function pos(e) {
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    }

    function onDown(e) {
      e.preventDefault();
      setDrawing(true);
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    function onMove(e) {
      if (!drawing) return;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    function onUp() {
      setDrawing(false);
      setSigDataUrl(canvas.toDataURL('image/png'));
    }
    function onResize() {
      rect = canvas.getBoundingClientRect();
    }

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

  function clearSig() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigDataUrl('');
  }

  return (
    <section className="mt-8 p-5 border rounded-2xl bg-white">
      <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        {CONSENT_SUMMARY.map((t, i) => (<li key={i}>{t}</li>))}
      </ul>
      <p className="text-sm text-gray-600 mt-2">
        Read the full agreement at <Link href="/consent" className="underline">/consent</Link>. Version: {CONSENT_VERSION}
      </p>

      <label className="flex items-start gap-3 mt-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span className="text-sm">
          I have read and agree to the Consent and Disclaimer Agreement.
        </span>
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full legal name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Signature (optional)</label>
          <div className="mt-1 border rounded-xl p-2">
            <canvas ref={canvasRef} width={500} height={140} className="w-full h-[140px] bg-gray-50 rounded-lg" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={clearSig} className="px-3 py-1 rounded-lg border">Clear</button>
              {sigDataUrl && <span className="text-xs text-gray-500">Signature captured</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

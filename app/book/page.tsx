'use client';

import React, { useEffect, useMemo, useState } from 'react';

/**
 * Minimal, stable replacement for /app/book/page.tsx
 * - Keeps Region/Date/Time selects (driven by /api/slots)
 * - Restores inputs: Client Name, Medical Professional Name, Medical Professional Email (optional), Your Email
 * - Restores short-form Consent summary + checkbox + typed name
 * - Saves consent (best-effort), then POSTs to /api/book and redirects using { redirectUrl | paymentUrl | url }
 * - Falls back to /success?ref=<bookingRef> if no redirect URL is provided
 *
 * Only this file changes. All other routes/APIs remain untouched.
 */

type SlotItem = {
  weekday: number;     // 0=Sun..6=Sat
  start: string;       // "HH:mm"
  end: string;         // "HH:mm"
  venueAddress?: string;
  note?: string;
};

type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotItem[]>;
};

function nextDatesForWeekday(weekday: number, count = 10) {
  const out: string[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; out.length < count && i < 120; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d.getDay() === weekday) {
      const iso = d.toISOString().slice(0, 10);
      out.push(iso);
    }
  }
  return out;
}

export default function BookPage() {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [slotsByRegion, setSlotsByRegion] = useState<Record<string, SlotItem[]>>({});
  const [region, setRegion] = useState<string>('');
  const [slotIdx, setSlotIdx] = useState<number>(0);
  const [dateISO, setDateISO] = useState<string>('');

  // Restored inputs
  const [clientName, setClientName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');

  // Consent short form
  const [consented, setConsented] = useState(false);
  const [consentTypedName, setConsentTypedName] = useState('');

  const canContinue = consented && consentTypedName.trim().length >= 2 && clientName.trim().length >= 2;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/slots', { cache: 'no-store' });
        const data: SlotsResponse = await res.json();
        if (!active) return;
        setRegions(data.regions || []);
        setSlotsByRegion(data.slots || {});
        const firstRegion = (data.regions || [])[0] || '';
        setRegion(firstRegion);
      } catch (e) {
        console.error('Failed to load slots', e);
      }
    })();
    return () => { active = false; };
  }, []);

  const currentSlots = useMemo<SlotItem[]>(() => slotsByRegion[region] || [], [slotsByRegion, region]);
  const dateOptions = useMemo<string[]>(() => {
    const s = currentSlots[slotIdx];
    if (!s) return [];
    return nextDatesForWeekday(s.weekday, 10);
  }, [currentSlots, slotIdx]);

  useEffect(() => {
    setSlotIdx(0);
  }, [region]);

  useEffect(() => {
    const opts = dateOptions;
    setDateISO(opts[0] || '');
  }, [dateOptions]);

  async function handleContinue(e: React.MouseEvent) {
    e.preventDefault();
    if (!canContinue || loading) return;
    setLoading(true);
    try {
      // best-effort consent store (won't block redirect if it fails)
      try {
        await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bid: null,
            consent: {
              accepted: consented,
              name: consentTypedName,
              consentVersion: '2025-08-24',
              signatureDataUrl: null
            }
          })
        });
      } catch {}

      const s = currentSlots[slotIdx];
      if (!s) throw new Error('No slot selected');

      const payload: any = {
        name: clientName,
        email: yourEmail,
        region,
        slot: `${dateISO} ${s.start}–${s.end}`,
        venue: s.venueAddress || '',
        referringName: medName || '',
        consentAccepted: true,
        dateISO,
        start: s.start,
        end: s.end,
        venueAddress: s.venueAddress || '',
        medicalEmail: medEmail || '',
      };

      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data?.error || 'Booking failed');
        setLoading(false);
        return;
      }
      const redirectUrl = data?.redirectUrl || data?.paymentUrl || data?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      if (data?.bookingRef) {
        window.location.href = `/success?ref=${encodeURIComponent(data.bookingRef)}`;
        return;
      }
      alert('Could not start payment (no redirectUrl)');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const s = currentSlots[slotIdx];

  return (
    <main className="px-6 py-8 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • minimal-restore • {new Date().toISOString().slice(0,10)}</div>
      <h1 className="text-3xl font-bold mb-4">Book a Good2Go Assessment</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <div className="text-sm font-medium">Region</div>
          <select className="mt-1 w-full border rounded-lg px-3 py-2" value={region} onChange={e => setRegion(e.target.value)}>
            {(regions || []).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Time</div>
          <select className="mt-1 w-full border rounded-lg px-3 py-2" value={slotIdx} onChange={e => setSlotIdx(parseInt(e.target.value))}>
            {currentSlots.map((sl, i) => (
              <option key={i} value={i}>{sl.start}–{sl.end}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Date</div>
          <select className="mt-1 w-full border rounded-lg px-3 py-2" value={dateISO} onChange={e => setDateISO(e.target.value)}>
            {dateOptions.map(d => (
              <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-medium">Client Name</div>
          <input className="mt-1 w-full border rounded-lg px-3 py-2" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full legal name" />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Your Email</div>
          <input className="mt-1 w-full border rounded-lg px-3 py-2" type="email" value={yourEmail} onChange={e => setYourEmail(e.target.value)} placeholder="you@example.com" />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Medical Professional Name (optional)</div>
          <input className="mt-1 w-full border rounded-lg px-3 py-2" value={medName} onChange={e => setMedName(e.target.value)} placeholder="Dr Jane Smith" />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Medical Professional Email (optional)</div>
          <input className="mt-1 w-full border rounded-lg px-3 py-2" type="email" value={medEmail} onChange={e => setMedEmail(e.target.value)} placeholder="doctor@clinic.nz" />
        </label>
      </div>

      <section className="mt-8 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025-08-24</p>

        <label className="flex items-start gap-3 mt-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={consented} onChange={e => setConsented(e.target.checked)} />
          <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>

        <div className="mt-3">
          <div className="text-sm font-medium">Type your full name to sign</div>
          <input className="mt-1 w-full border rounded-lg px-3 py-2" value={consentTypedName} onChange={e => setConsentTypedName(e.target.value)} placeholder="Your full legal name" />
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue || loading || !s || !dateISO}
          className={`px-4 py-2 rounded-xl text-white ${(!canContinue || !s || !dateISO || loading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'}`}
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
      {(!canContinue) && <p className="text-sm text-red-600 mt-2">Please tick consent and enter both Client Name and Consent Name to continue.</p>}

      {s && (
        <div className="mt-6 text-sm text-gray-700">
          {s.venueAddress && <div><span className="font-medium">Venue:</span> {s.venueAddress}</div>}
          {s.note && <div><span className="font-medium">Note:</span> {s.note}</div>}
        </div>
      )}
    </main>
  );
}

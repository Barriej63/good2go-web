'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotsResp = {
  regions: string[];
  slots: Record<string, { weekday: number; start: string; end: string; venueAddress?: string; note?: string }[]>;
};

const TAG = 'build: app/book/page.tsx • consent + region/slot + med email';

function nextDatesForWeekday(weekday: number, count = 10): string[] {
  const out: string[] = [];
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let add = (weekday - d.getDay() + 7) % 7;
  if (add === 0) add = 7; // next occurrence
  d.setDate(d.getDate() + add);
  for (let i=0;i<count;i++) {
    out.push(d.toISOString().slice(0,10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export default function BookPage() {
  const [cfg, setCfg] = useState<SlotsResp | null>(null);
  const [region, setRegion] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [slotIdx, setSlotIdx] = useState(0);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [medEmail, setMedEmail] = useState(''); // optional

  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/slots').then(r => r.json()).then(setCfg).catch(console.error);
  }, []);

  useEffect(() => {
    if (!cfg) return;
    const r0 = region || cfg.regions[0] || '';
    if (!region && r0) setRegion(r0);
  }, [cfg]);

  const regionSlots = useMemo(() => {
    return region && cfg ? (cfg.slots[region] || []) : [];
  }, [cfg, region]);

  const dateOptions = useMemo(() => {
    if (!regionSlots.length) return [];
    return nextDatesForWeekday(regionSlots[slotIdx]?.weekday ?? 1, 10);
  }, [regionSlots, slotIdx]);

  useEffect(() => {
    if (dateOptions.length && !dateISO) setDateISO(dateOptions[0]);
  }, [dateOptions]);

  const canContinue = accepted && fullName.trim().length >= 2 && email.includes('@') && region && dateISO && regionSlots.length>0;

  async function handleContinue() {
    if (!canContinue || loading) return;
    setLoading(true);

    // Save consent best-effort
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid: null, consent: { accepted: true, name: fullName, consentVersion: '2025-08-23' } })
      });
    } catch {}

    // Build payload compatible with your /api/book today + new fields
    const slot = regionSlots[slotIdx];
    const payload = {
      name: fullName,
      email,
      region,
      slot: `${dateISO} ${slot?.start}-${slot?.end}`,
      venue: slot?.venueAddress || '',
      referringName: '', // optional future field
      consentAccepted: true,
      // new fields for success/receipt display
      dateISO,
      start: slot?.start,
      end: slot?.end,
      venueAddress: slot?.venueAddress || '',
      medicalEmail: medEmail || null,
    };

    try {
      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      const redirectUrl = data?.redirectUrl || data?.paymentUrl || data?.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      if (data?.bookingRef) {
        // TEMP fallback: go to success showing details if server didn't return payment URL
        window.location.href = `/success?ref=${encodeURIComponent(data.bookingRef)}`;
        return;
      }
      alert('Could not start payment (no redirectUrl)');
    } catch (e:any) {
      alert('Could not start payment (network error)');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">{TAG}</div>
      <h1 className="text-3xl font-bold mb-4">Book a Good2Go Assessment</h1>

      <div className="grid gap-4 mb-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Region</label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2" value={region} onChange={e=>{setRegion(e.target.value); setSlotIdx(0);}}>
            {(cfg?.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Time</label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2" value={slotIdx} onChange={e=>setSlotIdx(Number(e.target.value))}>
            {regionSlots.map((s, i) => <option key={i} value={i}>{s.start}–{s.end}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Date</label>
          <select className="mt-1 w-full rounded-xl border px-3 py-2" value={dateISO} onChange={e=>setDateISO(e.target.value)}>
            {dateOptions.map(d => {
              const dd = new Date(d);
              return <option key={d} value={d}>{dd.toLocaleDateString()}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Your Email</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Medical Professional’s Email (optional)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={medEmail} onChange={e=>setMedEmail(e.target.value)} placeholder="doctor@clinic.nz" />
        </div>
      </div>

      <section className="mt-6 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent & Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a className="underline" href="/consent">/consent</a>. Version: 2025-08-23</p>

        <label className="flex items-start gap-3 mt-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
          <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>

        <div className="mt-4 max-w-sm">
          <label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full legal name" />
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
      {!canContinue && <p className="text-sm text-red-600 mt-2">Please complete region/date/time, enter your email, tick consent, and type your full name.</p>}
    </main>
  );
}

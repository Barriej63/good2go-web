'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = { weekday: number; start: string; end: string; venueAddress?: string; note?: string; };
type SlotsResp = { regions: string[]; slots: Record<string, SlotDef[]> };

function nextMatchingDates(weekday: number, count = 10): string[] {
  const dates: string[] = [];
  const today = new Date();
  const day = today.getDay();
  let delta = (weekday - day + 7) % 7;
  if (delta === 0) delta = 7; // next week if today
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta);
  for (let i=0;i<count;i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i*7);
    const iso = d.toISOString().slice(0,10);
    dates.push(iso);
  }
  return dates;
}

export default function BookPage() {
  const [data, setData] = useState<SlotsResp>({ regions: [], slots: {} });
  const [region, setRegion] = useState<string>('');
  const [dateISO, setDateISO] = useState<string>('');
  const [timeIdx, setTimeIdx] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [medicalEmail, setMedicalEmail] = useState<string>('');
  const [accepted, setAccepted] = useState<boolean>(false);
  const canContinue = accepted && name.trim().length >= 2 && email.includes('@');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j = await r.json();
        setData(j);
        const firstRegion = j.regions[0] || '';
        setRegion(firstRegion);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const regionSlots: SlotDef[] = useMemo(() => data.slots[region] || [], [data, region]);
  const dateOptions: string[] = useMemo(() => {
    if (!regionSlots.length) return [];
    return nextMatchingDates(regionSlots[0].weekday, 10);
  }, [regionSlots]);

  const timeOptions = regionSlots.map((s, i) => ({ label: `${s.start}–${s.end}`, idx: i }));

  useEffect(() => {
    if (dateOptions.length && !dateISO) setDateISO(dateOptions[0]);
  }, [dateOptions, dateISO]);

  async function onContinue() {
    if (!canContinue) return;
    const chosen = regionSlots[timeIdx];
    const slotLabel = `${dateISO} ${chosen?.start ?? ''}–${chosen?.end ?? ''}`;
    const payload = {
      name, email, region,
      slot: slotLabel,
      venue: chosen?.venueAddress || '',
      referringName: '',
      consentAccepted: true,
      dateISO, start: chosen?.start, end: chosen?.end,
      venueAddress: chosen?.venueAddress || '',
      medicalEmail: medicalEmail || null
    };
    try {
      // best-effort consent persistence
      await fetch('/api/consent', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bid: null, consent: { accepted: true, name, consentVersion: '2025-08-23' } }) });
    } catch {}
    const res = await fetch('/api/book', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    const redirectUrl = j.redirectUrl || j.paymentUrl || j.url;
    if (!redirectUrl) {
      alert('Could not start payment (no redirectUrl)');
      return;
    }
    window.location.href = redirectUrl;
  }

  const chosen = regionSlots[timeIdx];

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-sm text-gray-500 mb-2">build: app/book/page.tsx • consent + region/date/time</div>
      <h1 className="text-3xl font-bold mb-4">Book a Good2Go Assessment</h1>

      <div className="grid gap-4 mb-6">
        <label className="block">
          <div>Region</div>
          <select className="border rounded px-2 py-1" value={region} onChange={e => setRegion(e.target.value)}>
            {data.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <label className="block">
          <div>Date</div>
          <select className="border rounded px-2 py-1" value={dateISO} onChange={e => setDateISO(e.target.value)}>
            {dateOptions.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>)}
          </select>
        </label>

        <label className="block">
          <div>Time</div>
          <select className="border rounded px-2 py-1" value={timeIdx} onChange={e => setTimeIdx(parseInt(e.target.value))}>
            {timeOptions.map(o => <option key={o.idx} value={o.idx}>{o.label}</option>)}
          </select>
        </label>

        <label className="block">
          <div>Your Email</div>
          <input className="border rounded px-2 py-1 w-full" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        <label className="block">
          <div>Medical Professional’s Email (optional)</div>
          <input className="border rounded px-2 py-1 w-full" placeholder="doctor@clinic.nz" value={medicalEmail} onChange={e => setMedicalEmail(e.target.value)} />
        </label>

        <label className="block">
          <div>Full Name (type to sign)</div>
          <input className="border rounded px-2 py-1 w-full" placeholder="Your full legal name" value={name} onChange={e => setName(e.target.value)} />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
          <span>I have read and agree to the Consent and Disclaimer Agreement (<a href="/consent" className="underline">view</a>).</span>
        </label>
      </div>

      {chosen?.venueAddress && (
        <div className="text-sm text-gray-700 mb-4">
          <strong>Venue:</strong> {chosen.venueAddress}
        </div>
      )}

      <button disabled={!canContinue} onClick={onContinue}
        className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}>
        Continue to Payment
      </button>
    </main>
  );
}

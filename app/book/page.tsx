'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number;      // 0..6 Sun..Sat
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

type PackageType = 'baseline' | 'package4';

function fmtISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function getMonthMatrix(year: number, monthIdx: number) {
  // returns a 6x7 matrix of Date | null for display
  const first = new Date(year, monthIdx, 1);
  const startOffset = first.getDay(); // 0..6
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null); // 6 weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < 6; i++) weeks.push(cells.slice(i * 7, (i + 1) * 7));
  return weeks;
}

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function BookPage() {
  const [data, setData] = useState<SlotsResponse>({ regions: [], slots: {} });
  const [region, setRegion] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [pkg, setPkg] = useState<PackageType>('baseline');
  const [clientName, setClientName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const nextMonthDate = new Date(thisYear, thisMonth + 1, 1);

  const weeksThis = useMemo(() => getMonthMatrix(thisYear, thisMonth), [thisYear, thisMonth]);
  const weeksNext = useMemo(() => getMonthMatrix(nextMonthDate.getFullYear(), nextMonthDate.getMonth()), [thisYear, thisMonth]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j: SlotsResponse = await r.json();
        setData(j);
        if (!region && j.regions.length) setRegion(j.regions[0]);
      } catch (e) {
        console.error('load slots failed', e);
      }
    })();
  }, []);

  useEffect(() => { setSlotIndex(0); }, [region]);

  const slot: SlotDef | null = useMemo(() => {
    const arr = data.slots[region] || [];
    return arr.length ? arr[Math.max(0, Math.min(slotIndex, arr.length - 1))] : null;
  }, [data, region, slotIndex]);

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  useEffect(() => {
    // reset selection when pkg/time/region changes
    setSelectedDates([]);
  }, [pkg, region, slotIndex]);

  function isAllowed(d: Date | null) {
    if (!d || !slot) return false;
    // allowed if matches weekday and date >= today
    const isFutureOrToday = d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getDay() === slot.weekday && isFutureOrToday;
  }

  function onPick(d: Date) {
    if (!slot) return;
    const first = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // strip time
    if (pkg === 'baseline') {
      setSelectedDates([first]);
    } else {
      // package of 4 weekly sessions: first + 7 + 14 + 21 days
      setSelectedDates([first, addDays(first, 7), addDays(first, 14), addDays(first, 21)]);
    }
  }

  async function handleContinue() {
    if (!slot || !selectedDates.length || !consentOK || processing) return;
    setProcessing(true);
    try {
      const first = selectedDates[0];
      const dateISO = fmtISODate(first);
      const slotStr = `${dateISO} ${slot.start}–${slot.end}`;
      // best-effort consent
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid: null,
          consent: { accepted: true, name: consentName, consentVersion: '2025-08-24', signatureDataUrl: null }
        })
      });
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: slotStr,
          venue: slot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          dateISO,
          start: slot.start, end: slot.end,
          venueAddress: slot.venueAddress || '',
          medicalEmail: medEmail || null,
          packageType: pkg,
          allDates: selectedDates.map(fmtISODate),
        })
      });
      const j = await res.json();
      const url = j?.redirectUrl || j?.paymentUrl || j?.url;
      if (url) window.location.href = url;
      else if (j?.bookingRef) window.location.href = `/success?ref=${encodeURIComponent(j.bookingRef)}`;
      else { alert('Could not start payment (no redirectUrl)'); setProcessing(false); }
    } catch (e) {
      console.error(e);
      alert('There was an error. Please try again.');
      setProcessing(false);
    }
  }

  function MonthGrid({ weeks, title }:{weeks:(Date|null)[][], title:string}) {
    return (
      <div className="w-full md:w-[420px]">
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-1">
          {WEEKDAYS.map(w => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((d, i) => {
            const isBlank = !d;
            const allowed = isAllowed(d!);
            const sel = !!d && selectedDates.some(s => s.getTime() === new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
            return (
              <button
                key={i}
                disabled={isBlank || !allowed}
                onClick={() => d && onPick(d)}
                className={[
                  "aspect-square rounded-md border text-sm",
                  isBlank ? "bg-transparent border-transparent cursor-default" :
                  allowed ? (sel ? "bg-black text-white border-black" : "hover:bg-gray-100") :
                  "bg-gray-100 text-gray-400 cursor-not-allowed"
                ].join(' ')}
              >
                {d ? d.getDate() : ""}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const canContinue = !!slot && !!selectedDates.length && consentOK && consentName.trim().length>1 && clientName.trim().length>1 && yourEmail.trim().length>3;

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-grid-final • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      {/* Package options */}
      <div className="flex items-center gap-6 mb-4">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" value="baseline" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} />
          <span>Baseline — <span className="font-semibold">$65</span></span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" value="package4" checked={pkg==='package4'} onChange={()=>setPkg('package4')} />
          <span>Package (4 weekly sessions) — <span className="font-semibold">$199</span></span>
        </label>
      </div>

      {/* Region & Time */}
      <div className="flex flex-wrap gap-6 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Region</label>
          <select className="border rounded-xl px-3 py-2 min-w-[220px]" value={region} onChange={e=>setRegion(e.target.value)}>
            {data.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <select className="border rounded-xl px-3 py-2 min-w-[220px]" value={String(slotIndex)} onChange={e=>setSlotIndex(Number(e.target.value))}>
            {(data.slots[region]||[]).map((s, i) => <option key={i} value={i}>{s.start}–{s.end}</option>)}
          </select>
        </div>
      </div>

      {/* Two month calendar */}
      <div className="flex flex-col md:flex-row gap-8 mb-4">
        <MonthGrid weeks={weeksThis} title={now.toLocaleString(undefined,{month:'long', year:'numeric'})} />
        <MonthGrid weeks={weeksNext} title={nextMonthDate.toLocaleString(undefined,{month:'long', year:'numeric'})} />
      </div>

      {/* Selected summary */}
      {selectedDates.length>0 && (
        <div className="text-sm text-gray-700 mb-6">
          Selected {pkg==='baseline' ? 'date' : 'dates'}: {selectedDates.map(d=>d.toLocaleDateString()).join(', ')}
        </div>
      )}

      {/* Client & emails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div>
          <label className="block mb-1 font-medium">Client Name</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={clientName} onChange={e=>setClientName(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Your Email</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={yourEmail} onChange={e=>setYourEmail(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Medical Professional Name (optional)</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={medName} onChange={e=>setMedName(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Medical Professional Email (optional)</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
        </div>
      </div>

      {/* Consent short form */}
      <section className="mt-8 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025‑08‑24
        </p>
        <label className="flex items-start gap-3 mt-4">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={consentOK} onChange={e=>setConsentOK(e.target.checked)} />
          <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>
        <div className="mt-3 max-w-sm">
          <label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={consentName} onChange={e=>setConsentName(e.target.value)} placeholder="Your full legal name" />
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <button onClick={handleContinue} disabled={!canContinue || processing}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}>
          {processing ? 'Processing…' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
    </main>
  );
}

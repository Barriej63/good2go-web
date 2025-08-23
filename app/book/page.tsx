'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number;      // 0=Sun..6=Sat
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};
type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmtISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseISO(iso: string) {
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, (m||1)-1, d||1);
}
function addDays(iso: string, days: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return fmtISO(d);
}
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
}
function monthName(date: Date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}
function nextOnWeekday(fromIso: string, weekday: number) {
  const d = parseISO(fromIso);
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  return fmtISO(d);
}

export default function BookPage() {
  const [data, setData] = useState<SlotsResponse>({ regions: [], slots: {} });
  const [region, setRegion] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [packageType, setPackageType] = useState<'baseline'|'package4'>('baseline');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [yourEmail, setYourEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  const today = new Date();
  const monthA = startOfMonth(today);
  const monthB = new Date(today.getFullYear(), today.getMonth()+1, 1);
  const todayIso = fmtISO(today);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j: SlotsResponse = await r.json();
        setData(j);
        setRegion(j.regions[0] || '');
        setSlotIndex(0);
      } catch (e) {
        console.error('load slots failed', e);
      }
    })();
  }, []);

  const currentSlot: SlotDef | null = useMemo(() => {
    const arr = data.slots[region] || [];
    return arr.length ? arr[Math.max(0, Math.min(slotIndex, arr.length-1))] : null;
  }, [data, region, slotIndex]);

  // ensure selection fits weekday; prefill first valid date
  useEffect(() => {
    if (!currentSlot) return;
    const first = nextOnWeekday(todayIso, currentSlot.weekday);
    if (packageType === 'package4') {
      setSelectedDates([first, addDays(first,7), addDays(first,14), addDays(first,21)]);
    } else {
      setSelectedDates([first]);
    }
  }, [region, slotIndex, packageType, currentSlot?.weekday]); // eslint-disable-line

  function isAllowed(iso: string): boolean {
    if (!currentSlot) return false;
    const d = parseISO(iso);
    return d.getDay() === currentSlot.weekday && iso >= todayIso;
  }

  function toggleDate(iso: string) {
    if (!isAllowed(iso)) return;
    if (packageType === 'baseline') {
      setSelectedDates([iso]);
    } else {
      // package of 4: base date + 3 weekly
      const base = iso;
      setSelectedDates([base, addDays(base,7), addDays(base,14), addDays(base,21)]);
    }
  }

  const canContinue = !!currentSlot
    && consentOK
    && consentName.trim().length > 1
    && clientName.trim().length > 1
    && yourEmail.trim().length > 3;

  async function handleContinue() {
    if (!canContinue || !currentSlot || selectedDates.length === 0) return;
    setProcessing(true);
    try {
      // best-effort consent save
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid: null,
          consent: {
            accepted: true,
            name: consentName,
            consentVersion: '2025-08-24',
            signatureDataUrl: null,
          }
        })
      });

      const firstDate = selectedDates[0];
      const legacySlot = `${firstDate} ${currentSlot.start}–${currentSlot.end}`;

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: legacySlot,
          venue: currentSlot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          dateISO: firstDate,
          start: currentSlot.start,
          end: currentSlot.end,
          venueAddress: currentSlot.venueAddress || '',
          medicalEmail: medEmail || null,
          packageType,
          allDates: selectedDates,
        })
      });
      const j = await res.json();
      const url = j?.redirectUrl || j?.paymentUrl || j?.url;
      if (url) window.location.href = url;
      else if (j?.bookingRef) window.location.href = `/success?ref=${encodeURIComponent(j.bookingRef)}`;
      else { alert('Could not start payment (no redirectUrl)'); setProcessing(false); }
    } catch (e) {
      console.error(e);
      alert('There was an error starting payment. Please try again.');
      setProcessing(false);
    }
  }

  function MonthGrid({ date }: { date: Date }) {
    const first = startOfMonth(date);
    const firstWd = first.getDay(); // 0..6
    const dim = daysInMonth(date);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based

    const cells: (string | null)[] = [];
    for (let i=0;i<firstWd;i++) cells.push(null);
    for (let day=1; day<=dim; day++) {
      const iso = fmtISO(new Date(year, month, day));
      cells.push(iso);
    }
    // Pad to 6 rows of 7
    while (cells.length % 7 !== 0) cells.push(null);
    while (cells.length < 42) cells.push(null);

    return (
      <div className="w-full">
        <div className="text-lg font-semibold mb-2">{monthName(date)}</div>
        <div className="grid grid-cols-7 gap-1 text-sm font-medium text-gray-600 mb-1">
          {WEEKDAY_LABELS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, idx) => {
            if (!iso) return <div key={idx} className="h-10 border rounded-xl bg-transparent" />;
            const allowed = isAllowed(iso);
            const selected = selectedDates.includes(iso);
            const baseCell = "h-10 flex items-center justify-center rounded-xl border";
            const styles = allowed
              ? (selected ? " bg-black text-white border-black" : " hover:bg-gray-100 cursor-pointer")
              : " bg-gray-100 text-gray-400";
            return (
              <button
                key={iso}
                type="button"
                disabled={!allowed}
                className={`${baseCell} ${styles}`}
                onClick={() => toggleDate(iso)}
                aria-pressed={selected}
              >
                {parseISO(iso).getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const timesForRegion = data.slots[region] || [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-2mo-responsive • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-4">Book a Good2Go Assessment</h1>

      {/* Product options */}
      <div className="mb-4 flex items-center gap-6">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" checked={packageType==='baseline'} onChange={()=>setPackageType('baseline')} />
          <span>Baseline — <span className="font-semibold">$65</span></span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" checked={packageType==='package4'} onChange={()=>setPackageType('package4')} />
          <span>Package (4 weekly sessions) — <span className="font-semibold">$199</span></span>
        </label>
      </div>

      {/* Region & Time */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Region</label>
          <select
            value={region}
            onChange={(e)=>{ setRegion(e.target.value); setSlotIndex(0); }}
            className="border rounded-xl px-3 py-2 min-w-[200px]"
          >
            {data.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <select
            value={String(slotIndex)}
            onChange={(e)=>setSlotIndex(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 min-w-[180px]"
            disabled={!timesForRegion.length}
          >
            {timesForRegion.map((s, i) => <option key={i} value={i}>{s.start}–{s.end}</option>)}
          </select>
        </div>
      </div>

      {/* Calendars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <MonthGrid date={monthA} />
        <MonthGrid date={monthB} />
      </div>

      {/* Selected dates preview */}
      <div className="mb-6 text-sm">
        {packageType==='package4' ? (
          <div>Selected dates (4 weekly): {selectedDates.join(', ')}</div>
        ) : (
          <div>Selected date: {selectedDates[0]}</div>
        )}
      </div>

      {/* Client + emails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Consent block summary */}
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
          <input type="checkbox" className="mt-1 h-4 w-4" checked={consentOK} onChange={(e)=>setConsentOK(e.target.checked)} />
          <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
        </label>
        <div className="mt-3 max-w-sm">
          <label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={consentName} onChange={(e)=>setConsentName(e.target.value)} placeholder="Your full legal name" />
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleContinue}
          disabled={!canContinue || processing}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {processing ? 'Processing…' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
    </main>
  );
}

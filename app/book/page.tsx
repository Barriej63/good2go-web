'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number;      // 0=Sun .. 6=Sat
  start: string;        // 'HH:mm'
  end: string;          // 'HH:mm'
  venueAddress?: string | null;
  note?: string | null;
};

type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

const WD_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WD_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISODate(v: string) {
  const [y,m,d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m-1, d);
}

function nextDateForWeekday(from: Date, weekday: number) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function Calendar({
  selectedISO,
  onSelect,
  allowedWeekday,           // number 0..6
}: {
  selectedISO: string;
  onSelect: (iso: string) => void;
  allowedWeekday: number | null;
}) {
  const [cursor, setCursor] = useState<Date>(() => {
    const s = parseISODate(selectedISO);
    return s ?? new Date();
  });

  useEffect(() => {
    const s = parseISODate(selectedISO);
    if (s) setCursor(s);
  }, [selectedISO]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const pad = monthStart.getDay(); // number of leading blanks

  const days: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }

  const selected = parseISODate(selectedISO);

  function cellClasses(d: Date | null) {
    if (!d) return 'h-10';
    const isAllowed = allowedWeekday == null ? true : d.getDay() === allowedWeekday;
    const isPast = d < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const base = 'h-10 w-10 flex items-center justify-center rounded-full';
    if (!isAllowed || isPast) return base + ' text-gray-400';
    const isSel = selected && d.toDateString() === selected.toDateString();
    return base + (isSel ? ' bg-black text-white' : ' hover:bg-black/10 cursor-pointer');
  }

  return (
    <div className="border rounded-2xl p-4 inline-block">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <div className="font-medium">{monthLabel}</div>
        <button
          type="button"
          className="px-2 py-1 border rounded-lg"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
        {WD_LABELS.map((w) => <div key={w} className="h-6 flex items-center justify-center">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex items-center justify-center">
            {d ? (
              <div
                className={cellClasses(d)}
                onClick={() => {
                  const isAllowed = allowedWeekday == null ? true : d.getDay() === allowedWeekday;
                  const isPast = d < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                  if (!isAllowed || isPast) return;
                  onSelect(fmtISODate(d));
                }}
              >
                {d.getDate()}
              </div>
            ) : (
              <div className="h-10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookCalendarPage() {
  const [data, setData] = useState<SlotsResponse>({ regions: [], slots: {} });
  const [region, setRegion] = useState<string>('');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [dateISO, setDateISO] = useState<string>('');
  const [yourEmail, setYourEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j: SlotsResponse = await r.json();
        setData(j);
        const initialRegion = j.regions[0] || '';
        setRegion(prev => prev || initialRegion);
        setSlotIndex(0);
      } catch (e) {
        console.error('failed to load slots', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!region || !data.slots[region] || data.slots[region].length === 0) return;
    const slot = data.slots[region][slotIndex] || data.slots[region][0];
    const d = nextDateForWeekday(new Date(), slot.weekday);
    setDateISO(fmtISODate(d));
  }, [region, slotIndex, data]);

  const currentSlot: SlotDef | null = useMemo(() => {
    const arr = data.slots[region] || [];
    return arr.length ? arr[Math.max(0, Math.min(slotIndex, arr.length - 1))] : null;
  }, [data, region, slotIndex]);

  const dateMatchesWeekday = useMemo(() => {
    if (!currentSlot || !dateISO) return false;
    const d = parseISODate(dateISO);
    if (!d) return false;
    return d.getDay() === currentSlot.weekday;
  }, [dateISO, currentSlot]);

  const canContinue = !!region
    && !!currentSlot
    && !!dateISO
    && dateMatchesWeekday
    && consentOK
    && consentName.trim().length > 1
    && clientName.trim().length > 1
    && yourEmail.trim().length > 3;

  async function handleContinue() {
    if (!canContinue || !currentSlot) return;
    setProcessing(true);
    try {
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

      const slotStr = `${dateISO} ${currentSlot.start}–${currentSlot.end}`;

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: slotStr,
          venue: currentSlot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          dateISO,
          start: currentSlot.start,
          end: currentSlot.end,
          venueAddress: currentSlot.venueAddress || '',
          medicalEmail: medEmail || null,
        })
      });
      const j = await res.json();
      const url = j?.redirectUrl || j?.paymentUrl || j?.url;
      if (url) {
        window.location.href = url;
      } else if (j?.bookingRef) {
        window.location.href = `/success?ref=${encodeURIComponent(j.bookingRef)}`;
      } else {
        alert('Could not start payment (no redirectUrl)');
        setProcessing(false);
      }
    } catch (e) {
      console.error(e);
      alert('There was an error starting payment. Please try again.');
      setProcessing(false);
    }
  }

  const timesForRegion = data.slots[region] || [];

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-highlight • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      {/* Region */}
      <label className="block mb-2 font-medium">Region</label>
      <select
        value={region}
        onChange={(e) => { setRegion(e.target.value); setSlotIndex(0); }}
        className="border rounded-xl px-3 py-2 mb-4 w-full max-w-xs"
      >
        {data.regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Time (slot picker) */}
      <label className="block mb-2 font-medium">Time</label>
      <select
        value={String(slotIndex)}
        onChange={(e) => setSlotIndex(Number(e.target.value))}
        className="border rounded-xl px-3 py-2 mb-4 w-full max-w-xs"
        disabled={!timesForRegion.length}
      >
        {timesForRegion.map((s, i) => (
          <option key={i} value={i}>
            {s.start}–{s.end} ({WD_FULL[s.weekday]}s)
          </option>
        ))}
      </select>

      {/* Visual calendar with allowed days enabled */}
      <label className="block mb-2 font-medium">Date</label>
      <div className="mb-2">
        <Calendar
          selectedISO={dateISO}
          onSelect={setDateISO}
          allowedWeekday={currentSlot ? currentSlot.weekday : null}
        />
      </div>
      {!dateMatchesWeekday && currentSlot && (
        <p className="text-sm text-red-600 mb-4">
          Please pick a {WD_FULL[currentSlot.weekday]} to match this clinic’s schedule.
        </p>
      )}

      {/* Client + emails (unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

      {/* Consent summary (short form) */}
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

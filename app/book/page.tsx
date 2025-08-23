'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number;      // 0=Sun..6=Sat
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};
type SlotsResponse = { regions: string[]; slots: Record<string, SlotDef[]> };

// ---------- helpers ----------
function fmtISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseISODate(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function addDays(d: Date, n: number) {
  const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  nd.setDate(nd.getDate()+n);
  return nd;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

// ---------- Calendar Grid components (no external lib) ----------
function MonthGrid({
  monthDate,
  activeWeekday,
  selectedDates,
  onPick,
  minDate,
  maxDate
}: {
  monthDate: Date;
  activeWeekday: number | null;
  selectedDates: Date[];
  onPick: (d: Date) => void;
  minDate: Date;
  maxDate: Date;
}) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);
  const start = addDays(first, -first.getDay()); // back to Sunday
  const cells: Date[] = [];
  for (let i=0;i<42;i++) cells.push(addDays(start, i)); // 6 weeks view

  function isAllowed(d: Date) {
    if (d < minDate || d > maxDate) return false;
    if (d.getMonth() !== monthDate.getMonth()) return false;
    if (activeWeekday===null) return false;
    return d.getDay() === activeWeekday;
  }
  const isSelected = (d: Date) => selectedDates.some(sd => sameDay(sd,d));

  return (
    <div className="rounded-2xl border overflow-hidden">
      <div className="text-center font-semibold py-2 bg-gray-50">{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</div>
      <div className="grid grid-cols-7 text-center text-xs font-medium bg-gray-100">
        {WEEKDAY_NAMES.map(w => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth()===monthDate.getMonth();
          const allowed = isAllowed(d);
          const selected = isSelected(d);
          const base = "h-10 flex items-center justify-center text-sm";
          let cls = "bg-white";
          if (!inMonth) cls = "bg-gray-50 text-gray-300";
          if (inMonth && !allowed) cls = "bg-gray-50 text-gray-400";
          if (allowed) cls = "bg-white hover:bg-black/5 cursor-pointer";
          if (selected) cls = "bg-black text-white font-semibold";
          return (
            <button
              key={idx}
              type="button"
              className={`${base} ${cls}`}
              onClick={() => allowed && onPick(d)}
              aria-disabled={!allowed}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Booking page ----------
export default function BookCalendarPage() {
  const [data, setData] = useState<SlotsResponse>({regions:[], slots:{}});
  const [region, setRegion] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [packageType, setPackageType] = useState<'baseline'|'package4'>('baseline');

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [clientName, setClientName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/slots', { cache: 'no-store' });
      const j: SlotsResponse = await r.json();
      setData(j);
      setRegion(prev => prev || j.regions[0] || '');
      setSlotIndex(0);
    })();
  }, []);

  const slotsForRegion: SlotDef[] = data.slots[region] || [];
  const currentSlot = slotsForRegion[slotIndex] || null;
  const today = useMemo(() => new Date(), []);

  // Reset selection when region/slot changes
  useEffect(()=>{
    setSelectedDates([]);
  }, [region, slotIndex]);

  function handlePick(d: Date) {
    if (!currentSlot) return;
    // Only accept if correct weekday; MonthGrid already checks, but double-guard
    if (d.getDay() !== currentSlot.weekday) return;
    if (packageType === 'baseline') {
      setSelectedDates([d]);
    } else {
      // package of 4: d + 7 + 14 + 21
      const d2 = addDays(d, 7);
      const d3 = addDays(d, 14);
      const d4 = addDays(d, 21);
      setSelectedDates([d, d2, d3, d4]);
    }
  }

  const canContinue = !!currentSlot
    && selectedDates.length > 0
    && consentOK
    && consentName.trim().length > 1
    && clientName.trim().length > 1
    && yourEmail.trim().length > 3;

  async function handleContinue() {
    if (!currentSlot || !canContinue) return;
    setProcessing(true);
    try {
      // Consent: best-effort
      await fetch('/api/consent', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          bid: null,
          consent: {
            accepted: true,
            name: consentName,
            consentVersion: '2025-08-24',
            signatureDataUrl: null
          }
        })
      });

      const first = selectedDates[0];
      const dateISO = fmtISODate(first);
      const slotStr = `${dateISO} ${currentSlot.start}–${currentSlot.end}`;
      const allDates = selectedDates.map(fmtISODate);

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: slotStr,
          venue: currentSlot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          // structured
          dateISO,
          start: currentSlot.start,
          end: currentSlot.end,
          venueAddress: currentSlot.venueAddress || '',
          medicalEmail: medEmail || null,
          packageType,
          allDates
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

  // Calendar range: this month + next month
  const monthA = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthB = new Date(today.getFullYear(), today.getMonth()+1, 1);
  const minDate = today; // no past
  const maxDate = new Date(today.getFullYear(), today.getMonth()+6, 0); // within 6 months for now

  // ---- UI ----
  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-grid-2mo • 2025-08-24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      {/* Product select */}
      <div className="flex items-center gap-6 mb-4">
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={packageType==='baseline'} onChange={()=>setPackageType('baseline')} />
          <span><span className="font-semibold">$65</span> Baseline</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={packageType==='package4'} onChange={()=>setPackageType('package4')} />
          <span>Package (4 weekly sessions) — <span className="font-semibold">$199</span></span>
        </label>
      </div>

      {/* Region + Time */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div>
          <label className="block mb-1 font-medium">Region</label>
          <select value={region} onChange={e=>{setRegion(e.target.value); setSlotIndex(0);}}
            className="border rounded-xl px-3 py-2 w-56">
            {data.regions.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Time</label>
          <select value={String(slotIndex)} onChange={e=>setSlotIndex(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 w-56">
            {(data.slots[region]||[]).map((s,i)=>(
              <option key={i} value={i}>{s.start}–{s.end}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar two months side by side */}
      <p className="text-sm text-gray-700 mb-2">
        {packageType==='package4' ? 'Select the first available date; we will book the next three sessions one week apart.' : 'Select a date that suits.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <MonthGrid monthDate={monthA} activeWeekday={currentSlot?.weekday ?? null} selectedDates={selectedDates} onPick={handlePick} minDate={minDate} maxDate={maxDate} />
        <MonthGrid monthDate={monthB} activeWeekday={currentSlot?.weekday ?? null} selectedDates={selectedDates} onPick={handlePick} minDate={minDate} maxDate={maxDate} />
      </div>

      {/* Show chosen dates */}
      {selectedDates.length > 0 && (
        <div className="mb-6 text-sm">
          <div className="font-medium mb-1">Selected date{selectedDates.length>1?'s':''}:</div>
          <ul className="list-disc pl-5">
            {selectedDates.map((d,i)=>(<li key={i}>{fmtISODate(d)} {currentSlot?.start}–{currentSlot?.end}</li>))}
          </ul>
        </div>
      )}

      {/* Client/contact & consent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

      <section className="mt-2 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025‑08‑24</p>
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
          className={`px-4 py-2 rounded-xl text-white ${canContinue?'bg-black':'bg-gray-400 cursor-not-allowed'}`}>
          {processing?'Processing…':'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
    </main>
  );
}

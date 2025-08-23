'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * Two‑month grid calendar (side‑by‑side on desktop, stacked on mobile).
 * - Reads slots from /api/slots
 * - Region + Time selects
 * - Baseline ($65): one date
 * - Package ($199): first date auto-expands to 4 weekly dates
 * - Consent short form + typed name
 * - Redirects using redirectUrl from /api/book
 *
 * build: app/book/page.tsx • calendar-2mo-grid-RESP • 2025‑08‑24
 */

type SlotDef = {
  weekday: number;           // 0=Sun .. 6=Sat
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};
type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

function pad2(n: number){ return String(n).padStart(2,'0'); }
function fmtISO(d: Date){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(d: Date, days: number){ const x = new Date(d); x.setDate(x.getDate()+days); return x; }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function makeMonthMatrix(base: Date){
  // Returns a matrix of 6 rows × 7 columns with Date objects (some may be prev/next month)
  const first = startOfMonth(base);
  const last = endOfMonth(base);
  const firstCell = addDays(first, -((first.getDay()+7)%7)); // back to Sunday
  const weeks: Date[][] = [];
  let cur = new Date(firstCell);
  for(let r=0;r<6;r++){
    const row: Date[] = [];
    for(let c=0;c<7;c++){
      row.push(new Date(cur));
      cur = addDays(cur,1);
    }
    weeks.push(row);
  }
  return weeks;
}

const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function BookPage(){
  // slots
  const [slotsData, setSlotsData] = useState<SlotsResponse>({ regions: [], slots: {} });
  const [region, setRegion] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);

  // package choice
  const [pkg, setPkg] = useState<'baseline' | 'package4'>('baseline');

  // calendar selection
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // identity / consent
  const [clientName, setClientName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  // load slots
  useEffect(()=>{
    (async()=>{
      try{
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j: SlotsResponse = await r.json();
        setSlotsData(j);
        if(!region && j.regions.length) setRegion(j.regions[0]);
        setSlotIndex(0);
      }catch(e){
        console.error('slots load failed', e);
      }
    })();
  },[]);

  const slot = useMemo(()=>{
    const list = slotsData.slots[region] || [];
    return list.length ? list[Math.max(0,Math.min(slotIndex, list.length-1))] : null;
  }, [slotsData, region, slotIndex]);

  // Calendar base months = current + next (local)
  const now = new Date();
  const monthA = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthB = new Date(now.getFullYear(), now.getMonth()+1, 1);
  const matrixA = makeMonthMatrix(monthA);
  const matrixB = makeMonthMatrix(monthB);

  function isAllowedDay(d: Date){
    if(!slot) return false;
    // Only allow same weekday as slot.weekday and date >= today
    const isWeekday = d.getDay() === slot.weekday;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const notPast = d >= today;
    // Also ensure the date is within either current or next month grid (we're rendering both)
    return isWeekday && notPast;
  }

  function togglePick(d: Date){
    if(!isAllowedDay(d)) return;
    const iso = fmtISO(d);

    if(pkg === 'baseline'){
      setSelectedDates([iso]);
      return;
    }

    // package4 logic: set 4 weekly dates starting from this date
    const four = [0,7,14,21].map(delta => fmtISO(addDays(d, delta)));
    setSelectedDates(four);
  }

  const canContinue = Boolean(
    slot &&
    selectedDates.length >= 1 &&
    consentOK &&
    consentName.trim().length > 1 &&
    clientName.trim().length > 1 &&
    yourEmail.trim().length > 3
  );

  async function handleContinue(){
    if(!slot || !canContinue) return;
    setProcessing(true);
    try{
      // Save consent best-effort
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: {
            accepted: true,
            name: consentName,
            consentVersion: '2025-08-24',
            signatureDataUrl: null
          }
        })
      });

      const firstDate = selectedDates[0];
      const slotStr = `${firstDate} ${slot.start}–${slot.end}`;

      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: slotStr,              // legacy
          venue: slot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          // structured:
          dateISO: firstDate,
          start: slot.start,
          end: slot.end,
          venueAddress: slot.venueAddress || '',
          medicalEmail: medEmail || null,
          packageType: pkg,
          allDates: selectedDates
        })
      });
      const j = await res.json();
      const url = j?.redirectUrl || j?.paymentUrl || j?.url;
      if(url){
        window.location.href = url;
      }else if(j?.bookingRef){
        window.location.href = `/success?ref=${encodeURIComponent(j.bookingRef)}`;
      }else{
        alert('Could not start payment (no redirectUrl)');
        setProcessing(false);
      }
    }catch(e){
      console.error(e);
      alert('There was an error starting payment. Please try again.');
      setProcessing(false);
    }
  }

  function DayCell({ d, activeMonth }: { d: Date, activeMonth: number }){
    const inThisMonth = d.getMonth() === activeMonth;
    const iso = fmtISO(d);
    const picked = selectedDates.includes(iso);
    const allowed = isAllowedDay(d) && inThisMonth;
    const base = "aspect-square grid place-items-center rounded-md text-sm select-none border";
    let cls = base + " ";

    if(!inThisMonth){
      cls += " text-gray-300 border-transparent ";
    }else if(allowed){
      cls += " border-gray-300 hover:bg-gray-100 cursor-pointer ";
    }else{
      cls += " text-gray-400 border-gray-200 bg-gray-50 ";
    }
    if(picked){
      cls += " !bg-black !text-white !border-black ";
    }

    return (
      <div
        onClick={()=> allowed && togglePick(d)}
        className={cls}
        title={iso}
        aria-disabled={!allowed}
      >
        {d.getDate()}
      </div>
    );
  }

  function MonthView({ monthBase }: { monthBase: Date }){
    const matrix = makeMonthMatrix(monthBase);
    const label = monthBase.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const activeMonthIdx = monthBase.getMonth();

    return (
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-semibold mb-3">{label}</div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-1">
          {dayNames.map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {matrix.flat().map((d, i) => (
            <DayCell key={i} d={d} activeMonth={activeMonthIdx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-xs text-gray-500 mb-3">build: app/book/page.tsx • calendar-2mo-grid-RESP • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      {/* Package options */}
      <div className="mb-4 flex flex-wrap items-center gap-6">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} />
          <span>Baseline — <span className="font-semibold">$65</span></span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='package4'} onChange={()=>setPkg('package4')} />
          <span>Package (4 weekly sessions) — <span className="font-semibold">$199</span></span>
        </label>
      </div>

      {/* Region & time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Region</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={region}
            onChange={(e)=>{ setRegion(e.target.value); setSlotIndex(0); setSelectedDates([]); }}
          >
            {(slotsData.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={String(slotIndex)}
            onChange={(e)=>{ setSlotIndex(Number(e.target.value)); setSelectedDates([]); }}
            disabled={!(slotsData.slots[region] || []).length}
          >
            {(slotsData.slots[region] || []).map((s, i) => (
              <option key={i} value={i}>{s.start}–{s.end}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two months responsive: side-by-side on md+, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MonthView monthBase={monthA} />
        <MonthView monthBase={monthB} />
      </div>

      {/* Selected dates summary (esp. for package4) */}
      {selectedDates.length > 0 && (
        <div className="mb-6 text-sm">
          <div className="font-medium mb-1">Selected date{selectedDates.length>1?'s':''}:</div>
          <ul className="list-disc ml-6">
            {selectedDates.map(d => <li key={d}>{d}</li>)}
          </ul>
        </div>
      )}

      {/* Client + emails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Client Name</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={clientName} onChange={e=>setClientName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Your Email</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={yourEmail} onChange={e=>setYourEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Medical Professional Name (optional)</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={medName} onChange={e=>setMedName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Medical Professional Email (optional)</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
        </div>
      </div>

      {/* Consent block */}
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

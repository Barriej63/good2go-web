'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * Booking page – style-only polish.
 * - Two months side-by-side (auto-stacks on small screens)
 * - Sun→Sat headers, square day cells
 * - Only allowed weekday is clickable
 * - Baseline ($65) = 1 date; Package ($199) = 4 weekly dates auto-selected
 * - Keeps Region/Time selects, consent short form, identity fields, redirect flow
 */

type SlotDef = {
  weekday: number; // 0..6 (Sun..Sat)
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};

type SlotsResponse = {
  regions: string[];
  slots: Record<string, SlotDef[]>;
};

function pad2(n: number){ return String(n).padStart(2, '0'); }
function fmtISO(d: Date){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function addDays(d: Date, n: number){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function buildMonthMatrix(base: Date){
  // 6 rows x 7 cols grid covering the whole rectangular month
  const first = startOfMonth(base);
  const firstCell = addDays(first, -((first.getDay()+7)%7)); // go back to Sunday
  const matrix: Date[][] = [];
  let cur = new Date(firstCell);
  for (let r=0;r<6;r++){
    const row: Date[] = [];
    for (let c=0;c<7;c++){ row.push(new Date(cur)); cur = addDays(cur,1); }
    matrix.push(row);
  }
  return matrix;
}

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Page(){
  // slots
  const [slotsData, setSlotsData] = useState<SlotsResponse>({ regions: [], slots: {} });
  const [region, setRegion] = useState<string>('');
  const [slotIdx, setSlotIdx] = useState<number>(0);

  // package
  const [pkg, setPkg] = useState<'baseline'|'package4'>('baseline');

  // selection
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
        if (!region && j.regions.length) setRegion(j.regions[0]);
        setSlotIdx(0);
      }catch(e){ console.error('load slots failed', e); }
    })();
  },[]);

  const slot = useMemo(()=>{
    const arr = slotsData.slots[region] || [];
    return arr.length ? arr[Math.max(0, Math.min(slotIdx, arr.length-1))] : null;
  }, [slotsData, region, slotIdx]);

  // calendar months
  const now = new Date();
  const monthA = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthB = new Date(now.getFullYear(), now.getMonth()+1, 1);
  const matA = buildMonthMatrix(monthA);
  const matB = buildMonthMatrix(monthB);

  function isAllowed(d: Date){
    if (!slot) return false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getDay() === slot.weekday && d >= today;
  }

  function pick(d: Date){
    if (!isAllowed(d)) return;
    const iso = fmtISO(d);
    if (pkg === 'baseline'){
      setSelectedDates([iso]);
    } else {
      setSelectedDates([0,7,14,21].map(delta => fmtISO(addDays(d, delta))));
    }
  }

  const canContinue = Boolean(
    slot &&
    selectedDates.length &&
    consentOK &&
    consentName.trim().length>1 &&
    clientName.trim().length>1 &&
    yourEmail.trim().length>3
  );

  async function handleContinue(){
    if (!slot || !canContinue) return;
    setProcessing(true);
    try{
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: { accepted: true, name: consentName, consentVersion: '2025-08-24', signatureDataUrl: null } })
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
          slot: slotStr,
          venue: slot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
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
      if (url) window.location.href = url;
      else if (j?.bookingRef) window.location.href = `/success?ref=${encodeURIComponent(j.bookingRef)}`;
      else { alert('Could not start payment (no redirectUrl)'); setProcessing(false); }
    }catch(e){
      console.error(e);
      alert('There was an error starting payment. Please try again.');
      setProcessing(false);
    }
  }

  function Day({ d, activeMonth }: { d: Date, activeMonth: number }){
    const inMonth = d.getMonth() === activeMonth;
    const iso = fmtISO(d);
    const picked = selectedDates.includes(iso);
    const allowed = isAllowed(d) && inMonth;

    const base: React.CSSProperties = {
      aspectRatio: '1 / 1',
      display: 'grid',
      placeItems: 'center',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      fontSize: 13,
      userSelect: 'none',
      transition: 'all .15s ease',
      boxShadow: '0 0 0 0 rgba(2,132,199,0)',
    };
    let style: React.CSSProperties = { ...base };
    if (!inMonth){
      style.color = '#d1d5db';
      style.borderColor = 'transparent';
    } else if (allowed){
      style.cursor = 'pointer';
      style.background = '#ffffff';
    } else {
      style.color = '#9ca3af';
      style.background = '#f8fafc';
    }
    if (picked){
      style.background = '#0369a1'; // sky-700
      style.color = '#fff';
      style.borderColor = '#0369a1';
      style.fontWeight = 600;
      style.boxShadow = '0 0 0 2px rgba(2,132,199,.25) inset';
    }

    return <div style={style} onClick={()=> allowed && pick(d)} title={iso} aria-disabled={!allowed}>{d.getDate()}</div>;
  }

  function Month({ base }: { base: Date }){
    const mat = buildMonthMatrix(base);
    const label = base.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const activeMonth = base.getMonth();

    return (
      <div className="cal-month">
        <div className="cal-title">{label}</div>
        <div className="cal-dow">
          {DOW.map(n => <div key={n} className="cal-dow-cell">{n}</div>)}
        </div>
        <div className="cal-grid">
          {mat.flat().map((d,i) => <Day key={i} d={d} activeMonth={activeMonth} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      <main className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <style>{`
          /* Calendar layout (self-contained) */
          .cal-wrap {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 22px;
          }
          .cal-month {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 18px;
            background: #f0f9ff; /* sky-50 tint */
            box-shadow: 0 1px 2px rgba(0,0,0,.04);
          }
          .cal-title {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: 10px;
            color: #0f172a; /* slate-900 */
          }
          .cal-dow {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            gap: 8px;
            text-align: center;
            color: #64748b; /* slate-500 */
            font-size: 12px;
            margin-bottom: 8px;
          }
          .cal-dow-cell { padding: 4px 0; }
          .cal-grid {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
        `}</style>

        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Book a Good2Go Assessment</h1>
          <p className="text-slate-600 mt-3 text-lg">
            Select product, region and time, then complete consent to proceed to payment.
          </p>
        </header>

        {/* Package options */}
        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="pkg" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} className="accent-sky-600" />
              <span className="font-medium text-slate-800">
                Baseline — <span className="text-slate-900">$65</span>
              </span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="pkg" checked={pkg==='package4'} onChange={()=>setPkg('package4')} className="accent-sky-600" />
              <span className="font-medium text-slate-800">
                Package (4 weekly sessions) — <span className="text-slate-900">$199</span>
              </span>
            </label>
          </div>
        </section>

        {/* Region & Time */}
        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Region</label>
              <select
                className="w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                value={region}
                onChange={(e)=>{ setRegion(e.target.value); setSlotIdx(0); setSelectedDates([]); }}>
                {(slotsData.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Time</label>
              <select
                className="w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                value={String(slotIdx)}
                onChange={(e)=>{ setSlotIdx(Number(e.target.value)); setSelectedDates([]); }}
                disabled={!(slotsData.slots[region] || []).length}>
                {(slotsData.slots[region] || []).map((s, i) => (
                  <option key={i} value={i}>{s.start}–{s.end}</option>
                ))}
              </select>
            </div>
          </div>
          {slot?.venueAddress && (
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-700 text-sm">
              <span className="font-medium">Venue:</span> {slot.venueAddress}
              {slot.note ? <span className="text-slate-600"> — {slot.note}</span> : null}
            </div>
          )}
        </section>

        {/* Calendar two months */}
        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 mb-6">
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <div className="cal-wrap">
              <Month base={monthA} />
              <Month base={monthB} />
            </div>
          </div>
        </section>

        {/* Selected summary */}
        {selectedDates.length > 0 && (
          <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 mb-6">
            <div className="text-sm">
              <div className="font-medium mb-2">Selected date{selectedDates.length>1?'s':''}:</div>
              <ul className="list-disc ml-6 space-y-1">{selectedDates.map(d => <li key={d}>{d}</li>)}</ul>
            </div>
          </section>
        )}

        {/* Identity + Consent */}
        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Client Name</label>
              <input className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-sky-300" value={clientName} onChange={e=>setClientName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Your Email</label>
              <input type="email" className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-sky-300" value={yourEmail} onChange={e=>setYourEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Medical Professional Name (optional)</label>
              <input className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-sky-300" value={medName} onChange={e=>setMedName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700">Medical Professional Email (optional)</label>
              <input type="email" className="border rounded-xl px-3 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-sky-300" value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
            </div>
          </div>

          {/* Consent */}
          <section className="mt-8 p-5 border rounded-2xl bg-slate-50">
            <h3 className="text-lg font-semibold mb-3 text-slate-900">Consent &amp; Disclosure</h3>
            <ul className="list-disc pl-5 text-[15px] text-slate-700 space-y-2">
              <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
              <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
              <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
            </ul>
            <p className="text-sm text-slate-600 mt-3">Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025-08-24</p>
            <label className="flex items-start gap-3 mt-5">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-sky-600" checked={consentOK} onChange={(e)=>setConsentOK(e.target.checked)} />
              <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
            </label>
            <div className="mt-4 max-w-sm">
              <label className="block text-sm font-medium mb-1">Full Name (type to sign)</label>
              <input className="w-full rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300" value={consentName} onChange={(e)=>setConsentName(e.target.value)} placeholder="Your full legal name" />
            </div>
          </section>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            onClick={handleContinue}
            disabled={!canContinue || processing}
            className={[
              'px-6 py-3 rounded-xl text-white shadow-sm transition',
              canContinue ? 'bg-sky-600 hover:bg-sky-700' : 'bg-slate-400 cursor-not-allowed'
            ].join(' ')}
          >
            {processing? 'Processing…':'Continue to Payment'}
          </button>
          <a className="px-6 py-3 rounded-xl border bg-white hover:bg-slate-50 text-slate-700" href="/">Cancel</a>
        </div>
      </main>
    </div>
  );
}

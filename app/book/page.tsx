'use client';
import React, { useEffect, useMemo, useState } from 'react';

/**
 * Booking page with a guaranteed inline-CSS two-month calendar grid.
 * - Two months side-by-side (auto-stacks on small screens)
 * - Sun→Sat headers, square day cells
 * - Only allowed weekday is clickable
 * - Baseline ($65) = 1 date; Package ($199) = 4 weekly dates auto-selected
 * - Keeps Region/Time selects, consent short form, identity fields, redirect flow
 *
 * build: app/book/page.tsx • calendar-2mo-inlinegrid-FIXED • 2025‑08‑24
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

  const canContinue = Boolean(slot && selectedDates.length && consentOK && consentName.trim().length>1 && clientName.trim().length>1 && yourEmail.trim().length>3);

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
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      fontSize: 12,
      userSelect: 'none'
    };
    let style: React.CSSProperties = { ...base };
    if (!inMonth){
      style.color = '#d1d5db';
      style.borderColor = 'transparent';
    } else if (allowed){
      style.cursor = 'pointer';
      style.background = '#fff';
    } else {
      style.color = '#9ca3af';
      style.background = '#f9fafb';
    }
    if (picked){
      style.background = '#111827';
      style.color = '#fff';
      style.borderColor = '#111827';
      style.fontWeight = 600;
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
    <main className="max-w-4xl mx-auto px-4 py-8">
      <style>{`
        /* Guaranteed calendar layout (no dependency on global CSS) */
        .cal-wrap {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .cal-month {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          background: #fff;
        }
        .cal-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .cal-dow {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 6px;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .cal-dow-cell { padding: 4px 0; }
        .cal-grid {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 6px !important;
        }
      `}</style>

      <div className="text-xs text-gray-500 mb-3">build: app/book/page.tsx • calendar-2mo-inlinegrid-FIXED • 2025‑08‑24</div>
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

      {/* Region & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Region</label>
          <select className="w-full border rounded-xl px-3 py-2"
            value={region}
            onChange={(e)=>{ setRegion(e.target.value); setSlotIdx(0); setSelectedDates([]); }}>
            {(slotsData.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <select className="w-full border rounded-xl px-3 py-2"
            value={String(slotIdx)}
            onChange={(e)=>{ setSlotIdx(Number(e.target.value)); setSelectedDates([]); }}
            disabled={!(slotsData.slots[region] || []).length}>
            {(slotsData.slots[region] || []).map((s, i) => (
              <option key={i} value={i}>{s.start}–{s.end}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar two months */}
      <div className="cal-wrap">
        <Month base={monthA} />
        <Month base={monthB} />
      </div>

      {/* Selected summary */}
      {selectedDates.length > 0 && (
        <div className="mb-6 text-sm">
          <div className="font-medium mb-1">Selected date{selectedDates.length>1?'s':''}:</div>
          <ul className="list-disc ml-6">{selectedDates.map(d => <li key={d}>{d}</li>)}</ul>
        </div>
      )}

      {/* Identity fields */}
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

      {/* Consent */}
      <section className="mt-8 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent & Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025‑08‑24</p>
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
        <button onClick={handleContinue} disabled={!canContinue || processing}
          className={`px-4 py-2 rounded-xl text-white ${canContinue? 'bg-black':'bg-gray-400 cursor-not-allowed'}`}>
          {processing? 'Processing…':'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
    </main>
  );
}

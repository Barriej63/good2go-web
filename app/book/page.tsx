'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = {
  weekday: number; // 0=Sun..6=Sat
  start: string;
  end: string;
  venueAddress?: string | null;
  note?: string | null;
};
type SlotsResponse = { regions: string[]; slots: Record<string, SlotDef[]> };

function fmtISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate()+n);
  return x;
}
function nextWeekday(from: Date, weekday: number) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate()+delta);
  return d;
}
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function BookPage() {
  const [data, setData] = useState<SlotsResponse>({regions:[], slots:{}});
  const [region, setRegion] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [pkg, setPkg] = useState<'baseline'|'package4'>('baseline');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // existing fields preserved
  const [clientName, setClientName] = useState('');
  const [yourEmail, setYourEmail] = useState('');
  const [medName, setMedName] = useState('');
  const [medEmail, setMedEmail] = useState('');
  const [consentOK, setConsentOK] = useState(false);
  const [consentName, setConsentName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch('/api/slots', {cache:'no-store'});
      const j: SlotsResponse = await r.json();
      setData(j);
      if(!region && j.regions.length) setRegion(j.regions[0]);
    }catch(e){ console.error(e); }
  })(); },[]);

  const slot: SlotDef | null = useMemo(()=>{
    const arr = data.slots[region] || [];
    return arr.length ? arr[Math.min(slotIndex, arr.length-1)] : null;
  }, [data, region, slotIndex]);

  // Prefill initial date(s)
  useEffect(()=>{
    if (!slot) return;
    const start = nextWeekday(new Date(), slot.weekday);
    if (pkg === 'baseline') setSelectedDates([fmtISO(start)]);
    else setSelectedDates([fmtISO(start), fmtISO(addDays(start,7)), fmtISO(addDays(start,14)), fmtISO(addDays(start,21))]);
  }, [slot, pkg]);

  // Helper: is allowed day
  const isAllowedDate = (d: Date) => {
    if (!slot) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dd >= today && dd.getDay() === slot.weekday;
  };

  function toggleDate(iso: string) {
    if (!slot) return;
    if (pkg === 'baseline') {
      setSelectedDates([iso]);
      return;
    }
    // package4: clicking first date regenerates the series
    const [y,m,da] = iso.split('-').map(Number);
    const first = new Date(y, m-1, da);
    const series = [0,7,14,21].map(n => fmtISO(addDays(first, n)));
    setSelectedDates(series);
  }

  const canContinue = Boolean(
    slot && selectedDates.length >= 1 &&
    clientName.trim().length > 1 &&
    yourEmail.trim().length > 3 &&
    consentOK && consentName.trim().length > 1
  );

  async function handleContinue() {
    if (!slot || !canContinue) return;
    setProcessing(true);
    try {
      await fetch('/api/consent', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ bid:null, consent:{ accepted:true, name: consentName, consentVersion:'2025-08-24', signatureDataUrl:null }})
      });
      const first = selectedDates[0];
      const legacySlot = `${first} ${slot.start}–${slot.end}`;
      const res = await fetch('/api/book', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name: clientName,
          email: yourEmail,
          region,
          slot: legacySlot,
          venue: slot.venueAddress || '',
          referringName: medName || '',
          consentAccepted: true,
          // structured:
          dateISO: first,
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
    } catch(e) {
      console.error(e);
      alert('There was an error starting payment.');
      setProcessing(false);
    }
  }

  // Calendar rendering
  function MonthGrid({ base }: { base: Date }) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m+1, 0);
    const days: (Date|null)[] = [];
    for (let i=0;i<first.getDay();i++) days.push(null);
    for (let d=1; d<=last.getDate(); d++) days.push(new Date(y,m,d));

    return (
      <div className="w-full">
        <div className="text-center font-semibold mb-2">{first.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
        <div className="grid grid-cols-7 text-xs text-gray-600 mb-1">
          {WD.map(h => <div key={h} className="py-1 text-center">{h}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={'b'+i} />;
            const iso = fmtISO(d);
            const allowed = isAllowedDate(d);
            const selected = selectedDates.includes(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={!allowed}
                onClick={() => allowed && toggleDate(iso)}
                className={[
                  "aspect-square rounded-lg border text-sm",
                  allowed ? "hover:bg-black/90 hover:text-white cursor-pointer" : "opacity-30 cursor-not-allowed bg-gray-100",
                  selected ? "bg-black text-white border-black" : "bg-white"
                ].join(' ')}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const left = new Date(); left.setDate(1);
  const right = new Date(left.getFullYear(), left.getMonth()+1, 1);

  const timesForRegion = data.slots[region] || [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-grid-clean • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      {/* Package chooser */}
      <div className="flex items-center gap-6 mb-4 text-lg">
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} />
          <span>Baseline — <strong>$65</strong></span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='package4'} onChange={()=>setPkg('package4')} />
          <span>Package (4 weekly sessions) — <strong>$199</strong></span>
        </label>
      </div>

      {/* Region / Time */}
      <div className="flex flex-wrap gap-6 mb-6">
        <div>
          <div className="text-sm font-medium mb-1">Region</div>
          <select className="border rounded-xl px-3 py-2"
            value={region}
            onChange={(e)=>{ setRegion(e.target.value); setSlotIndex(0);}}
          >
            {(data.regions).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Time</div>
          <select className="border rounded-xl px-3 py-2"
            value={String(slotIndex)}
            onChange={(e)=>setSlotIndex(Number(e.target.value))}
            disabled={!(data.slots[region]||[]).length}
          >
            {(timesForRegion).map((s, i)=>(
              <option key={i} value={i}>{s.start}–{s.end}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Two-month calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <MonthGrid base={left} />
        <MonthGrid base={right} />
      </div>

      {/* Selected dates summary */}
      <div className="mb-6 text-sm">
        {pkg==='baseline' ? (
          <div>Selected date: <strong>{selectedDates[0] || '—'}</strong></div>
        ) : (
          <div>Selected dates (4 weekly): <strong>{selectedDates.join(', ') || '—'}</strong></div>
        )}
      </div>

      {/* Client + emails */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm font-medium">Client Name</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={clientName} onChange={e=>setClientName(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Your Email</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={yourEmail} onChange={e=>setYourEmail(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Medical Professional Name (optional)</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={medName} onChange={e=>setMedName(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium">Medical Professional Email (optional)</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
        </div>
      </div>

      {/* Consent */}
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

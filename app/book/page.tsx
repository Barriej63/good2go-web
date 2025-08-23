'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = { weekday: number, start: string, end: string, venueAddress?: string, note?: string };
type SlotsResponse = { regions: string[], slots: Record<string, SlotDef[]> };

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function nextDatesForWeekday(wd: number, count=10): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i=0;i<60 && out.length<count;i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i);
    if (d.getDay() === wd) out.push(d);
  }
  return out;
}

export default function BookPage() {
  const [config, setConfig] = useState<SlotsResponse | null>(null);
  const [region, setRegion] = useState<string>('');
  const [dateISO, setDateISO] = useState<string>('');
  const [slotIdx, setSlotIdx] = useState<number>(0);
  const [consented, setConsented] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/slots', { cache: 'no-store' });
        const j = await r.json();
        setConfig(j);
        if (j?.regions?.length) setRegion(j.regions[0]);
      } catch (e:any) {
        console.error(e);
      }
    })();
  }, []);

  const slot = useMemo<SlotDef | null>(() => {
    if (!config || !region) return null;
    return config.slots[region]?.[slotIdx] || null;
  }, [config, region, slotIdx]);

  const dates = useMemo<Date[]>(() => {
    if (!slot) return [];
    return nextDatesForWeekday(slot.weekday, 10);
  }, [slot]);

  useEffect(() => {
    if (dates[0]) setDateISO(toISODate(dates[0]));
  }, [dates.length]);

  async function handleContinue() {
    setErr('');
    setLoading(true);
    try {
      // best effort consent save
      try {
        await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bid: null,
            consent: { accepted: consented, name: fullName, consentVersion: '2025-08-23' }
          })
        });
      } catch {}

      // create booking and get redirect url
      const payload = {
        region,
        dateISO,
        start: slot?.start,
        end: slot?.end,
        venueAddress: slot?.venueAddress || null,
        consentAccepted: consented,
        fullName
      };

      let redirectUrl: string | null = null;

      if (typeof window !== 'undefined' && typeof (window as any).createBookingAndGetRedirectUrl === 'function') {
        const res = await (window as any).createBookingAndGetRedirectUrl(payload);
        redirectUrl = res?.redirectUrl || res?.paymentUrl || res?.url || null;
      } else {
        const r = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const txt = await r.text();
        let j: any = {};
        try { j = JSON.parse(txt); } catch { j = {}; }
        redirectUrl = j?.redirectUrl || j?.paymentUrl || j?.url || null;
        if (!redirectUrl) {
          console.error('Booking API raw response:', txt);
          alert('Could not start payment (no redirectUrl). Check server logs for /api/book.');
          setLoading(false);
          return;
        }
      }

      window.location.href = redirectUrl as string;
    } catch (e:any) {
      setErr(e?.message || 'Unexpected error');
      setLoading(false);
    }
  }

  const canGo = !!region && !!dateISO && !!slot && consented && fullName.trim().length>=2;

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • consent + region/date/time</div>
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      {/* Region */}
      <label className="block mb-2 font-medium">Region</label>
      <select className="border rounded-xl px-3 py-2 mb-4" value={region} onChange={e=>setRegion(e.target.value)}>
        {config?.regions?.map((r:string) => (<option key={r} value={r}>{r}</option>))}
      </select>

      {/* Date */}
      <label className="block mb-2 font-medium">Date</label>
      <select className="border rounded-xl px-3 py-2 mb-4" value={dateISO} onChange={e=>setDateISO(e.target.value)}>
        {dates.map(d => {
          const iso = toISODate(d);
          const label = d.toLocaleDateString(undefined, { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
          return (<option key={iso} value={iso}>{label}</option>);
        })}
      </select>

      {/* Time */}
      <label className="block mb-2 font-medium">Time</label>
      <select className="border rounded-xl px-3 py-2 mb-6" value={String(slotIdx)} onChange={e=>setSlotIdx(parseInt(e.target.value,10))}>
        {(config?.slots?.[region] || []).map((s:SlotDef, i:number) => (
          <option key={i} value={i}>{s.start}–{s.end}</option>
        ))}
      </select>

      {/* Consent short form */}
      <h3 className="text-xl font-semibold mb-2">Consent & Disclosure</h3>
      <ul className="list-disc pl-6 text-sm text-gray-700 mb-2">
        <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
        <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
        <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
      </ul>
      <div className="text-sm mb-4">Read the full agreement at <a className="underline" href="/consent">/consent</a>. Version: 2025-08-23</div>

      <label className="flex items-start gap-3 mb-3">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={consented} onChange={e=>setConsented(e.target.checked)} />
        <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
      </label>

      <div className="mb-6">
        <label className="block text-sm font-medium">Full Name (type to sign)</label>
        <input className="mt-1 border rounded-xl px-3 py-2 w-full" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full legal name" />
      </div>

      <div className="flex gap-3">
        <button onClick={handleContinue} disabled={!canGo || loading} className={`px-4 py-2 rounded-xl text-white ${canGo ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}>
          {loading ? 'Processing…' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>

      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

      {slot?.venueAddress && <div className="mt-6 text-sm text-gray-700"><strong>Venue:</strong> {slot.venueAddress}</div>}
      {slot?.note && <div className="mt-1 text-sm text-gray-500"><strong>Note:</strong> {slot.note}</div>}
    </main>
  );
}

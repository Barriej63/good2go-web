'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = { weekday: number; start: string; end: string; venueAddress?: string; note?: string };
type SlotsAPI = { regions: string[]; slots: Record<string, SlotDef[]> };

function nextDatesForWeekday(weekday: number, count = 10) {
  const out: Date[] = [];
  const now = new Date();
  // start from tomorrow to avoid past time confusion
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  while (out.length < count) {
    if (d.getDay() === weekday) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function BookPage() {
  const [data, setData] = useState<SlotsAPI | null>(null);
  const [region, setRegion] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [slotIndex, setSlotIndex] = useState(0);
  const [fullName, setFullName] = useState('');
  const [medEmail, setMedEmail] = useState(''); // optional
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/slots', { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      if (j.regions?.length) setRegion(j.regions[0]);
    })();
  }, []);

  const currentSlots: SlotDef[] = useMemo(() => {
    if (!data || !region) return [];
    return data.slots?.[region] || [];
  }, [data, region]);

  const dateOpts = useMemo(() => {
    if (!currentSlots.length) return [];
    const wd = currentSlots[0].weekday;
    const dates = nextDatesForWeekday(wd, 10);
    return dates;
  }, [currentSlots]);

  useEffect(() => {
    if (dateOpts.length) {
      const first = dateOpts[0];
      const iso = first.toISOString().slice(0,10);
      setDateISO(iso);
    }
  }, [dateOpts.length]);

  const venue = currentSlots[slotIndex]?.venueAddress || '';
  const note = currentSlots[slotIndex]?.note || '';

  const canContinue = accepted && fullName.trim().length >= 2 && region && dateISO && currentSlots.length>0;

  async function handleContinue() {
    if (!canContinue) return;
    setLoading(true);

    // Save consent best-effort
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bid: null,
          consent: { accepted: true, name: fullName, consentVersion: '2025-08-23' }
        })
      });
    } catch {}

    // Call your booking API
    let redirectUrl: string | undefined;
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region, dateISO,
          start: currentSlots[slotIndex]?.start,
          end: currentSlots[slotIndex]?.end,
          venueAddress: venue,
          medicalEmail: medEmail || null,
          fullName
        })
      });
      const data = await res.json();
      redirectUrl = data?.redirectUrl || data?.paymentUrl || data?.url;
    } catch (e) {
      console.error(e);
    }

    if (!redirectUrl) {
      alert('Could not start payment (no redirectUrl)');
      setLoading(false);
      return;
    }
    window.location.href = redirectUrl;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-3">build: app/book/page.tsx • consent + region/date/time + med email</div>
      <h1 className="text-3xl font-bold mb-3">Book a Good2Go Assessment</h1>
      {!data ? <p>Loading slots…</p> : (
        <>
          <div className="grid gap-4 mb-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Region</label>
              <select className="mt-1 w-full border rounded-xl px-3 py-2"
                value={region} onChange={e=>setRegion(e.target.value)}>
                {data.regions.map((r:string)=> <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Date</label>
              <select className="mt-1 w-full border rounded-xl px-3 py-2"
                value={dateISO} onChange={e=>setDateISO(e.target.value)}>
                {dateOpts.map((d,i)=> {
                  const iso = d.toISOString().slice(0,10);
                  const display = d.toLocaleDateString(undefined,{weekday:'short', year:'numeric', month:'short', day:'numeric'});
                  return <option key={iso} value={iso}>{display}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Time</label>
              <select className="mt-1 w-full border rounded-xl px-3 py-2"
                value={String(slotIndex)} onChange={e=>setSlotIndex(parseInt(e.target.value))}>
                {currentSlots.map((s,idx)=> <option key={idx} value={idx}>{s.start}–{s.end}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium">Medical professional’s email (optional)</label>
            <input type="email" placeholder="name@clinic.example"
              className="mt-1 w-full border rounded-xl px-3 py-2"
              value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium">Full Name (type to sign)</label>
            <input type="text" className="mt-1 w-full border rounded-xl px-3 py-2"
              placeholder="Your full legal name" value={fullName} onChange={e=>setFullName(e.target.value)} />
          </div>

          <label className="flex items-start gap-2 mb-2">
            <input type="checkbox" className="mt-1" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
            <span>I have read and agree to the Consent and Disclaimer Agreement. Read at <a className="underline" href="/consent" target="_blank">/consent</a>.</span>
          </label>

          <div className="text-sm text-gray-600 mb-4">
            {venue && <div><strong>Venue:</strong> {venue}</div>}
            {note && <div><strong>Note:</strong> {note}</div>}
          </div>

          <div className="mt-3">
            <button disabled={!canContinue || loading}
              onClick={handleContinue}
              className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}>
              {loading ? 'Processing…' : 'Continue to Payment'}
            </button>
            <a className="ml-3 px-4 py-2 rounded-xl border" href="/">Cancel</a>
          </div>
        </>
      )}
    </main>
  );
}

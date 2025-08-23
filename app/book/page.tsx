'use client';
import React, { useEffect, useMemo, useState } from 'react';

// Inline Consent so there are no import path surprises
function ConsentInline({ onChange }: { onChange: (c: any) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => onChange({ accepted, name: name.trim(), consentVersion: '2025-08-23' }), [accepted, name]);
  return (
    <section className="mt-8 p-5 border rounded-2xl bg-white">
      <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
        <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
        <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
        <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
      </ul>
      <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a className="underline" href="/consent">/consent</a>. Version: 2025-08-23</p>

      <label className="flex items-start gap-3 mt-4">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
        <span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span>
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input type="text" className="mt-1 w-full rounded-xl border px-3 py-2" value={name} onChange={e => setName(e.target.value)} placeholder="Your full legal name" />
        </div>
      </div>
    </section>
  );
}

// Helpers
function parseHHMM(s: string) {
  const [h, m] = s.split(':').map(Number);
  return { h, m };
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function formatNZ(d: Date) {
  return d.toLocaleDateString('en-NZ', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

type SlotTemplate = { weekday: number; start: string; end: string };
type SlotsResponse = { regions: string[]; slots: Record<string, SlotTemplate[]> };

export default function BookPage() {
  const [config, setConfig] = useState<SlotsResponse | null>(null);
  const [region, setRegion] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [slotIdx, setSlotIdx] = useState<number>(0);
  const [consent, setConsent] = useState<any>({ accepted: false, name: '' });
  const [loading, setLoading] = useState(false);
  const canContinue = consent.accepted && consent.name && region && dateStr;

  // fetch slot config
  useEffect(() => { (async () => {
    try {
      const r = await fetch('/api/slots', { cache: 'no-store' });
      const data = await r.json();
      setConfig(data);
      if (!region && data?.regions?.length) setRegion(data.regions[0]);
    } catch (e) { console.error(e); }
  })(); }, []);

  const upcomingDates = useMemo(() => {
    if (!config || !region) return [];
    const tpl = (config.slots?.[region] || [])[0];
    if (!tpl) return [];
    const today = new Date();
    const out: { value: string; label: string }[] = [];
    // find next 10 occurrences of tpl.weekday (0=Sun)
    let d = new Date(today);
    for (let i=0; out.length<10 && i<90; i++) {
      d = addDays(i===0 ? d : d, 1);
      if (d.getDay() === tpl.weekday) {
        const { h, m } = parseHHMM(tpl.start);
        d.setHours(h, m, 0, 0);
        const iso = d.toISOString().slice(0,10);
        out.push({ value: iso, label: formatNZ(d) });
      }
    }
    return out;
  }, [config, region]);

  async function onContinue() {
    if (!canContinue || loading) return;
    setLoading(true);
    // Save consent (best-effort)
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent })
      });
    } catch {}

    // Call your existing /api/book to obtain { redirectUrl }
    const payload = { region, date: dateStr, slotIndex: slotIdx, fullName: consent.name };
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const redirectUrl = data?.redirectUrl || data?.paymentUrl || data?.url;
    if (!redirectUrl) {
      alert('Could not start payment (no redirectUrl)');
      setLoading(false);
      return;
    }
    window.location.href = redirectUrl;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • consent + region/slot</div>
      <h1 className="text-3xl font-bold mb-2">Book a Good2Go Assessment</h1>
      <p className="text-gray-700 mb-6">Select your region and preferred slot, then confirm consent to continue to payment.</p>

      <section className="p-5 border rounded-2xl bg-white">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Region</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2"
              value={region}
              onChange={e=>{ setRegion(e.target.value); setDateStr(''); }}
            >
              {config?.regions?.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Date</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2"
              value={dateStr}
              onChange={e=>setDateStr(e.target.value)}
            >
              <option value="">Select...</option>
              {upcomingDates.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Time</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2"
              value={slotIdx}
              onChange={e=>setSlotIdx(parseInt(e.target.value))}
            >
              {(config?.slots?.[region] || []).map((s, i) => (
                <option value={i} key={i}>{s.start}–{s.end}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ConsentInline onChange={setConsent} />

      <div className="mt-6 flex gap-3">
        <button onClick={onContinue} disabled={!canContinue || loading}
          className={`px-4 py-2 rounded-xl text-white ${canContinue ? 'bg-black' : 'bg-gray-400 cursor-not-allowed'}`}>
          {loading ? 'Processing…' : 'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
      {!canContinue && <p className="text-sm text-red-600 mt-2">Please choose region, date & time, tick consent and enter your full name.</p>}
    </main>
  );
}

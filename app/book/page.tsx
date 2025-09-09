'use client';
import React, { useEffect, useMemo, useState } from 'react';
import VenueFromConfig from './ui/VenueFromConfig';

/** Compact types kept as-is */
type SlotDef = {
  weekday: number;
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
function buildMonthMatrix(base: Date){
  const first = startOfMonth(base);
  const firstCell = addDays(first, -((first.getDay()+7)%7));
  const matrix: Date[][] = [];
  let cur = new Date(firstCell);
  for (let r=0;r<6;r++){ const row: Date[]=[]; for (let c=0;c<7;c++){ row.push(new Date(cur)); cur = addDays(cur,1);} matrix.push(row); }
  return matrix;
}
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Reusable inline styles (framework-free) */
const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  marginBottom: 24
};
const rowGap: React.CSSProperties = { marginBottom: 16 };
const rowGapLarge: React.CSSProperties = { marginBottom: 24 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #cbd5e1', borderRadius: 12,
  padding: '12px 14px', fontSize: 16, height: 46, outline: 'none'
};
const selectStyle = inputStyle;
const pageWrap: React.CSSProperties = { background: '#f1f5f9' };
const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '48px 20px 120px' };

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

  // inside useEffect() that loads slots
useEffect(() => {
  (async () => {
    try {
      const r = await fetch('/api/slots', { cache: 'no-store' });
      if (!r.ok) {
        console.error('load slots failed', r.status);
        setSlotsData({ regions: [], slots: {} });
        return;
      }
      const j: SlotsResponse = await r.json();
      setSlotsData({
        regions: Array.isArray(j?.regions) ? j.regions : [],
        slots: typeof j?.slots === 'object' && j?.slots ? j.slots : {},
      });
      if (!region && Array.isArray(j?.regions) && j.regions.length) setRegion(j.regions[0]);
      setSlotIdx(0);
    } catch (e) {
      console.error('load slots failed', e);
      setSlotsData({ regions: [], slots: {} });
    }
  })();
}, []);

  const slot = useMemo(()=>{
    const arr = slotsData.slots[region] || [];
    return arr.length ? arr[Math.max(0, Math.min(slotIdx, arr.length-1))] : null;
  }, [slotsData, region, slotIdx]);

  // calendar months
  const now = new Date();
  const monthA = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthB = new Date(now.getFullYear(), now.getMonth()+1, 1);

  function isAllowed(d: Date){
    if (!slot) return false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.getDay() === slot.weekday && d >= today;
  }

  function pick(d: Date){
    if (!isAllowed(d)) return;
    const iso = fmtISO(d);
    if (pkg === 'baseline') setSelectedDates([iso]);
    else setSelectedDates([0,7,14,21].map(delta => fmtISO(addDays(d, delta))));
  }

  const canContinue = Boolean(
    slot && selectedDates.length &&
    consentOK && consentName.trim().length>1 &&
    clientName.trim().length>1 && yourEmail.trim().length>3
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

  /** Calendar day cell */
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
      background: '#ffffff'
    };
    let style: React.CSSProperties = { ...base };
    if (!inMonth){ style.color = '#d1d5db'; style.borderColor = 'transparent'; }
    else if (!allowed){ style.color = '#9ca3af'; style.background = '#f8fafc'; }
    else { style.cursor = 'pointer'; }
    if (picked){
      style.background = '#0369a1';
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
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, background: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#0f172a' }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 8 }}>
          {DOW.map(n => <div key={n} style={{ padding: '4px 0' }}>{n}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {mat.flat().map((d,i) => <Day key={i} d={d} activeMonth={activeMonth} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: 0 }}>Book a Good2Go Assessment</h1>
          <p style={{ color: '#475569', marginTop: 12, fontSize: 18 }}>
            Select product, region and time, then complete consent to proceed to payment.
          </p>
        </div>

        {/* Package options */}
        <section style={card}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="pkg" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} />
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Baseline — <span>$65</span></span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="pkg" checked={pkg==='package4'} onChange={()=>setPkg('package4')} />
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Package (4 weekly sessions) — <span>$199</span></span>
            </label>
          </div>
        </section>

        {/* Region + Time */}
        <section style={card}>
          <div style={rowGapLarge}>
            <label style={labelStyle}>Region</label>
            <select
              style={selectStyle}
              value={region}
              onChange={(e)=>{ setRegion(e.target.value); setSlotIdx(0); setSelectedDates([]); }}>
              {(slotsData.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={rowGapLarge}>
            <label style={labelStyle}>Time</label>
            <select
              style={selectStyle}
              value={String(slotIdx)}
              onChange={(e)=>{ setSlotIdx(Number(e.target.value)); setSelectedDates([]); }}
              disabled={!(slotsData.slots[region] || []).length}>
              {(slotsData.slots[region] || []).map((s, i) => (
                /* Only show start time */
                <option key={i} value={i}>{s.start}</option>
              ))}
            </select>
          </div>

          {/* VENUE (config-aware) */}
          {slot && (
            <div
              style={{
                ...rowGap,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                fontSize: 14
              }}
            >
              <strong>Venue:</strong>{' '}
              <VenueFromConfig
                region={region}
                time={slot.start}
                fallback={slot.venueAddress || ''}
              />
              {slot.note ? <> — {slot.note}</> : null}
            </div>
          )}
        </section>

        {/* Calendar */}
        <section style={card}>
          <div style={{ borderRadius: 14, background: '#eff6ff', border: '1px solid #bae6fd', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 22 }}>
              <Month base={monthA} />
              <Month base={monthB} />
            </div>
          </div>
        </section>

        {/* Identity fields */}
        <section style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            <div style={rowGapLarge}>
              <label style={labelStyle}>Client Name</label>
              <input style={inputStyle} value={clientName} onChange={e=>setClientName(e.target.value)} />
            </div>
            <div style={rowGapLarge}>
              <label style={labelStyle}>Your Email</label>
              <input type="email" style={inputStyle} value={yourEmail} onChange={e=>setYourEmail(e.target.value)} />
            </div>
            <div style={rowGapLarge}>
              <label style={labelStyle}>Medical Professional Name (optional)</label>
              <input style={inputStyle} value={medName} onChange={e=>setMedName(e.target.value)} />
            </div>
            <div style={rowGapLarge}>
              <label style={labelStyle}>Medical Professional Email (optional)</label>
              <input type="email" style={inputStyle} value={medEmail} onChange={e=>setMedEmail(e.target.value)} />
            </div>
          </div>

          {/* Consent */}
          <section style={{ marginTop: 28, padding: 20, border: '1px solid #e2e8f0', borderRadius: 16, background: '#f8fafc' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Consent &amp; Disclosure</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.6 }}>
              <li style={rowGap}>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
              <li style={rowGap}>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
              <li style={rowGap}>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
            </ul>

            {/* Highlighted link + version */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 12 }}>
              <a
                href="/consent"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '10px 14px', background: '#0284c7', color: '#fff',
                  borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none'
                }}
              >
                View full Consent Agreement
              </a>
              <span style={{ color: '#475569', fontSize: 14 }}>Version: 2025-08-24</span>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <input type="checkbox" checked={consentOK} onChange={(e)=>setConsentOK(e.target.checked)} style={{ marginTop: 4, width: 18, height: 18 }} />
                <span style={{ fontSize: 14, color: '#334155' }}>
                  I have read and agree to the Consent and Disclaimer Agreement.
                </span>
              </label>

              <div style={{ maxWidth: 420 }}>
                <label style={labelStyle}>Full Name (type to sign)</label>
                <input
                  style={inputStyle}
                  value={consentName}
                  onChange={(e)=>setConsentName(e.target.value)}
                  placeholder="Your full legal name"
                />
              </div>
            </div>
          </section>
        </section>

        {/* Actions */}
        <div style={{ marginTop: 28, display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={handleContinue}
            disabled={!canContinue || processing}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 16,
              color: '#fff',
              background: canContinue ? '#0284c7' : '#94a3b8',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              border: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,.06)'
            }}
          >
            {processing? 'Processing…':'Continue to Payment'}
          </button>

          <a href="/" style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            textDecoration: 'none'
          }}>
            Cancel
          </a>
        </div>
      </main>
    </div>
  );
}

'use client';
import React, { useEffect, useMemo, useState } from 'react';

type SlotDef = { weekday:number; start:string; end:string; venueAddress?:string|null; note?:string|null };
type SlotsResponse = { regions:string[]; slots: Record<string, SlotDef[]> };
type PackageType = 'baseline'|'package4';

function fmtISO(d: Date){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function parseISO(s:string){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(d:Date,n:number){ const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+n); return x; }
function isSameDay(a:Date,b:Date){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

function monthMatrix(year:number, month:number){
  const first=new Date(year,month,1);
  const startOffset=first.getDay();
  const start=new Date(year,month,1-startOffset);
  const weeks:Date[][]=[];
  for(let w=0;w<6;w++){ const row:Date[]=[]; for(let d=0;d<7;d++){ row.push(addDays(start,w*7+d)); } weeks.push(row); }
  return weeks;
}

export default function BookCalendarTwoMonths(){
  const [data,setData]=useState<SlotsResponse>({regions:[], slots:{}});
  const [region,setRegion]=useState<string>('');
  const [slotIndex,setSlotIndex]=useState<number>(0);
  const [pkg,setPkg]=useState<PackageType>('baseline');
  const [selectedDates,setSelectedDates]=useState<string[]>([]);
  const [yourEmail,setYourEmail]=useState('');
  const [clientName,setClientName]=useState('');
  const [medName,setMedName]=useState('');
  const [medEmail,setMedEmail]=useState('');
  const [consentOK,setConsentOK]=useState(false);
  const [consentName,setConsentName]=useState('');
  const [processing,setProcessing]=useState(false);

  useEffect(()=>{ (async()=>{ const r=await fetch('/api/slots',{cache:'no-store'}); const j:SlotsResponse=await r.json(); setData(j); const initial=j.regions[0]||''; setRegion(prev=>prev||initial); setSlotIndex(0); })(); },[]);

  const currentSlot:SlotDef|null=useMemo(()=>{ const arr=data.slots[region]||[]; return arr.length?arr[Math.max(0,Math.min(slotIndex,arr.length-1))]:null; },[data,region,slotIndex]);
  useEffect(()=>{ setSelectedDates([]); },[region,slotIndex,pkg]);

  const today=new Date();
  const months=useMemo(()=>{ const a={y:today.getFullYear(), m:today.getMonth()}; const bD=new Date(today.getFullYear(), today.getMonth()+1, 1); const b={y:bD.getFullYear(), m:bD.getMonth()}; return [a,b]; },[]);

  function allowedDay(d:Date){ if(!currentSlot) return false; const now=new Date(today.getFullYear(), today.getMonth(), today.getDate()); return d.getDay()===currentSlot.weekday && d>=now; }
  function toggleDate(d:Date){
    if(!currentSlot||!allowedDay(d)) return;
    if(pkg==='baseline'){ setSelectedDates([fmtISO(d)]); return; }
    const first=d; const arr:string[]=[]; for(let i=0;i<4;i++){ arr.push(fmtISO(addDays(first,i*7))); } setSelectedDates(arr);
  }

  const canContinue=!!region&&!!currentSlot&&selectedDates.length>0&&consentOK&&consentName.trim().length>1&&clientName.trim().length>1&&yourEmail.trim().length>3;

  async function handleContinue(){
    if(!canContinue||!currentSlot) return;
    setProcessing(true);
    try{
      await fetch('/api/consent',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({bid:null, consent:{accepted:true,name:consentName,consentVersion:'2025-08-24',signatureDataUrl:null}})});
      const firstISO=selectedDates[0];
      const slotStr=`${firstISO} ${currentSlot.start}–${currentSlot.end}`;
      const res=await fetch('/api/book',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:clientName,email:yourEmail,region,slot:slotStr,venue:currentSlot.venueAddress||'',referringName:medName||'',consentAccepted:true,dateISO:firstISO,start:currentSlot.start,end:currentSlot.end,venueAddress:currentSlot.venueAddress||'',medicalEmail:medEmail||null,packageType:pkg,allDates:selectedDates})});
      const j=await res.json(); const url=j?.redirectUrl||j?.paymentUrl||j?.url; if(url) window.location.href=url; else if(j?.bookingRef) window.location.href=`/success?ref=${encodeURIComponent(j.bookingRef)}`; else { alert('Could not start payment (no redirectUrl)'); setProcessing(false); }
    }catch(e){ console.error(e); alert('There was an error starting payment. Please try again.'); setProcessing(false); }
  }

  function MonthView({y,m}:{y:number,m:number}){
    const weeks=monthMatrix(y,m);
    const monthName=new Date(y,m,1).toLocaleString(undefined,{month:'long', year:'numeric'});
    return (
      <div className="p-3 border rounded-2xl">
        <div className="text-center font-medium mb-2">{monthName}</div>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((d,i)=>{
            const inMonth=d.getMonth()===m;
            const allowed=allowedDay(d)&&inMonth;
            const isSel=selectedDates.some(s=>isSameDay(parseISO(s), d));
            return (
              <button key={i} type="button" onClick={()=>toggleDate(d)} disabled={!allowed}
                className={["w-9 h-9 flex items-center justify-center rounded-md text-sm",
                  inMonth?"":"opacity-40",
                  allowed?"cursor-pointer hover:bg-gray-200":"text-gray-300",
                  isSel?"bg-black text-white hover:bg-black":""
                ].join(' ')}>
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const timesForRegion=data.slots[region]||[];

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="text-xs text-gray-500 mb-2">build: app/book/page.tsx • calendar-2mo • 2025‑08‑24</div>
      <h1 className="text-3xl font-bold mb-6">Book a Good2Go Assessment</h1>

      <div className="mb-4 flex gap-6">
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='baseline'} onChange={()=>setPkg('baseline')} />
          <span>Baseline — <strong>$65</strong></span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="pkg" checked={pkg==='package4'} onChange={()=>setPkg('package4')} />
          <span>Package (4 weekly sessions) — <strong>$199</strong></span>
        </label>
      </div>

      <label className="block mb-2 font-medium">Region</label>
      <select value={region} onChange={(e)=>{setRegion(e.target.value); setSlotIndex(0);}}
        className="border rounded-xl px-3 py-2 mb-4 w-full max-w-xs">
        {data.regions.map(r=><option key={r} value={r}>{r}</option>)}
      </select>

      <label className="block mb-2 font-medium">Time</label>
      <select value={String(slotIndex)} onChange={(e)=>setSlotIndex(Number(e.target.value))}
        className="border rounded-xl px-3 py-2 mb-4 w-full max-w-xs" disabled={!timesForRegion.length}>
        {timesForRegion.map((s,i)=><option key={i} value={i}>{s.start}–{s.end}</option>)}
      </select>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <MonthView y={months[0].y} m={months[0].m} />
        <MonthView y={months[1].y} m={months[1].m} />
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Select a {currentSlot ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][currentSlot.weekday] : 'day'} that suits.
        {pkg==='package4' && selectedDates.length>0 && (<> You are booking <strong>4 weekly sessions</strong> on: {selectedDates.join(', ')}.</>)}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div><label className="block mb-1 font-medium">Client Name</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={clientName} onChange={e=>setClientName(e.target.value)} /></div>
        <div><label className="block mb-1 font-medium">Your Email</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={yourEmail} onChange={e=>setYourEmail(e.target.value)} /></div>
        <div><label className="block mb-1 font-medium">Medical Professional Name (optional)</label>
          <input className="border rounded-xl px-3 py-2 w-full" value={medName} onChange={e=>setMedName(e.target.value)} /></div>
        <div><label className="block mb-1 font-medium">Medical Professional Email (optional)</label>
          <input type="email" className="border rounded-xl px-3 py-2 w-full" value={medEmail} onChange={e=>setMedEmail(e.target.value)} /></div>
      </div>

      <section className="mt-8 p-5 border rounded-2xl bg-white">
        <h3 className="text-lg font-semibold mb-2">Consent &amp; Disclosure</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>I consent to Good2Go sharing relevant assessment results with my nominated referring medical professional for the purpose of ongoing care.</li>
          <li>I understand I can revoke consent at any time in writing, except where action has already been taken based on this consent.</li>
          <li>I acknowledge Good2Go is a clinical decision support (CDS) tool, not a diagnostic instrument.</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">Read the full agreement at <a href="/consent" className="underline">/consent</a>. Version: 2025‑08‑24</p>
        <label className="flex items-start gap-3 mt-4"><input type="checkbox" className="mt-1 h-4 w-4" checked={consentOK} onChange={e=>setConsentOK(e.target.checked)} /><span className="text-sm">I have read and agree to the Consent and Disclaimer Agreement.</span></label>
        <div className="mt-3 max-w-sm"><label className="block text-sm font-medium">Full Name (type to sign)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2" value={consentName} onChange={e=>setConsentName(e.target.value)} placeholder="Your full legal name" /></div>
      </section>

      <div className="mt-6 flex gap-3">
        <button onClick={handleContinue} disabled={!canContinue||processing}
          className={`px-4 py-2 rounded-xl text-white ${canContinue?'bg-black':'bg-gray-400 cursor-not-allowed'}`}>
          {processing?'Processing…':'Continue to Payment'}
        </button>
        <a className="px-4 py-2 rounded-xl border" href="/">Cancel</a>
      </div>
    </main>
  );
}

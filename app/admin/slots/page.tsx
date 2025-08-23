'use client';
import React, { useEffect, useState } from 'react';

type Slot = { weekday:number, start:string, end:string, venueAddress?:string, note?:string };
type Doc = { id:string, data:any };

const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function AdminSlotsPage() {
  const [key, setKey] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [region, setRegion] = useState('Auckland');
  const [slot, setSlot] = useState<Slot>({ weekday:2, start:'17:30', end:'18:30', venueAddress:'', note:'' });
  const [msg, setMsg] = useState('');

  async function load() {
    setMsg('');
    const res = await fetch('/api/admin/slots', { headers: { 'x-admin-key': key } });
    if (!res.ok) { setMsg('Auth failed or error'); return; }
    const j = await res.json();
    setDocs(j.docs);
  }

  async function addSlot() {
    setMsg('');
    const res = await fetch('/api/admin/slots', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-admin-key': key },
      body: JSON.stringify({ region, slot })
    });
    if (!res.ok) { setMsg('Add failed'); return; }
    await load();
    setMsg('Added');
  }

  async function removeSlot(regionId:string, idx:number) {
    setMsg('');
    const res = await fetch(`/api/admin/slots?region=${encodeURIComponent(regionId)}&index=${idx}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': key }
    });
    if (!res.ok) { setMsg('Delete failed'); return; }
    await load();
    setMsg('Deleted');
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin – Regions & Time Slots</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium">Admin Key (from env ADMIN_KEY)</label>
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="Enter admin key"
          className="mt-1 border rounded px-3 py-2 w-full max-w-sm" />
        <div className="mt-2 flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded bg-black text-white">Load</button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      <section className="border rounded-xl p-4 mb-6">
        <h2 className="font-semibold mb-2">Add Slot</h2>
        <div className="grid grid-cols-2 gap-3 max-w-2xl">
          <div>
            <label className="block text-sm">Region name</label>
            <input value={region} onChange={e=>setRegion(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm">Weekday</label>
            <select value={slot.weekday} onChange={e=>setSlot({...slot, weekday:Number(e.target.value)})} className="border rounded px-3 py-2 w-full">
              {WD.map((w, i)=>(<option key={i} value={i}>{w}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm">Start (HH:mm)</label>
            <input value={slot.start} onChange={e=>setSlot({...slot, start:e.target.value})} className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label className="block text-sm">End (HH:mm)</label>
            <input value={slot.end} onChange={e=>setSlot({...slot, end:e.target.value})} className="border rounded px-3 py-2 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Venue address</label>
            <input value={slot.venueAddress||''} onChange={e=>setSlot({...slot, venueAddress:e.target.value})} className="border rounded px-3 py-2 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm">Note (optional)</label>
            <input value={slot.note||''} onChange={e=>setSlot({...slot, note:e.target.value})} className="border rounded px-3 py-2 w-full" />
          </div>
        </div>
        <button onClick={addSlot} className="mt-3 px-3 py-2 rounded bg-black text-white">Add slot</button>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Existing</h2>
        {!docs.length && <p className="text-sm text-gray-600">Nothing loaded yet.</p>}
        <div className="space-y-4">
          {docs.filter(d=>d.id.startsWith('timeslots_')).map(d=>{
            const region = d.id.replace(/^timeslots[_-]/,'').replace(/_/g,' ');
            const list: any[] = Array.isArray(d.data.slots)? d.data.slots: [];
            return (
              <div key={d.id} className="border rounded p-3">
                <h3 className="font-medium mb-2">{region}</h3>
                {(!list.length) && <div className="text-sm text-gray-600">No slots</div>}
                <ul className="space-y-1">
                  {list.map((s, idx)=>(
                    <li key={idx} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                      <span>{WD[s.weekday??0]} {s.start}–{s.end} • {s.venueAddress||''}</span>
                      <button onClick={()=>removeSlot(region, idx)} className="text-red-600 text-sm">Delete</button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  );
}

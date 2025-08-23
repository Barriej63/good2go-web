'use client';
import React, { useState, useEffect } from 'react';
import { WEEKDAY_NAMES } from '@/lib/weekdays';

type Slot = { weekday:number, start:string, end:string, venueAddress?:string, note?:string };
type SlotsResp = { regions:string[], slots: Record<string, Slot[]> };

export default function AdminSlotsPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SlotsResp | null>(null);
  const [error, setError] = useState<string>('');

  async function loadPublic() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/slots');
      const j = await r.json();
      setData(j);
    } catch (e:any) {
      setError('Failed to load public slots');
    } finally {
      setLoading(false);
    }
  }

  async function addSlot(region:string, slot: Omit<Slot,'weekday'> & { weekday:any }) {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-admin-token': token },
        body: JSON.stringify({ region, ...slot })
      });
      if (!r.ok) throw new Error(await r.text());
      await loadPublic();
    } catch (e:any) {
      setError('Add failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSlot(region:string, index:number, updates: Partial<Slot>) {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/slots', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', 'x-admin-token': token },
        body: JSON.stringify({ region, index, ...updates })
      });
      if (!r.ok) throw new Error(await r.text());
      await loadPublic();
    } catch (e:any) {
      setError('Save failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function delSlot(region:string, index:number) {
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/admin/slots?region=${encodeURIComponent(region)}&index=${index}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!r.ok) throw new Error(await r.text());
      await loadPublic();
    } catch (e:any) {
      setError('Delete failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ loadPublic(); }, []);

  return (
    <main className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin • Slots</h1>
      <p className="text-sm text-gray-600 mb-4">Enter your ADMIN_TOKEN to modify slots.</p>

      <div className="mb-6 flex gap-3 items-center">
        <input placeholder="ADMIN_TOKEN" className="border rounded px-3 py-2 w-80" value={token} onChange={e=>setToken(e.target.value)} />
        <button className="px-3 py-2 rounded border" onClick={loadPublic} disabled={loading}>Reload</button>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-gray-500 mb-3">Working…</p>}

      {!data ? <p>Loading…</p> : (
        <div className="space-y-8">
          {data.regions.map(region => {
            const slots = data.slots[region] || [];
            return (
              <section key={region} className="border rounded-xl p-4 bg-white">
                <h2 className="font-semibold mb-2">{region}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="py-1">#</th>
                      <th className="py-1">Weekday</th>
                      <th className="py-1">Start</th>
                      <th className="py-1">End</th>
                      <th className="py-1">Venue</th>
                      <th className="py-1">Note</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1 pr-2">{i}</td>
                        <td className="py-1 pr-2">{WEEKDAY_NAMES[s.weekday]}</td>
                        <td className="py-1 pr-2">{s.start}</td>
                        <td className="py-1 pr-2">{s.end}</td>
                        <td className="py-1 pr-2">
                          <input className="border rounded px-2 py-1 w-full" defaultValue={s.venueAddress || ''}
                            onBlur={(e)=>saveSlot(region, i, { venueAddress: e.target.value })} />
                        </td>
                        <td className="py-1 pr-2">
                          <input className="border rounded px-2 py-1 w-full" defaultValue={s.note || ''}
                            onBlur={(e)=>saveSlot(region, i, { note: e.target.value })} />
                        </td>
                        <td className="py-1">
                          <button className="px-2 py-1 rounded border" onClick={()=>delSlot(region, i)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {slots.length === 0 && (
                      <tr><td colSpan={7} className="text-gray-500 py-2">No slots yet.</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Add new slot */}
                <AddSlotForm onAdd={(slot)=>addSlot(region, slot)} />
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function AddSlotForm({ onAdd }:{ onAdd:(slot:any)=>void }) {
  const [weekday, setWeekday] = useState<any>('tuesday');
  const [start, setStart] = useState('17:30');
  const [end, setEnd] = useState('18:30');
  const [venueAddress, setVenue] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="mt-4 grid grid-cols-6 gap-2 items-end">
      <div>
        <label className="block text-xs text-gray-600">Weekday</label>
        <select className="border rounded px-2 py-1" value={weekday} onChange={e=>setWeekday(e.target.value)}>
          {WEEKDAY_NAMES.map((n, i)=>(<option key={n} value={n}>{n}</option>))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-600">Start</label>
        <input className="border rounded px-2 py-1" value={start} onChange={e=>setStart(e.target.value)} placeholder="HH:mm" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">End</label>
        <input className="border rounded px-2 py-1" value={end} onChange={e=>setEnd(e.target.value)} placeholder="HH:mm" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Venue</label>
        <input className="border rounded px-2 py-1" value={venueAddress} onChange={e=>setVenue(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Note</label>
        <input className="border rounded px-2 py-1" value={note} onChange={e=>setNote(e.target.value)} />
      </div>
      <div>
        <button className="px-3 py-2 rounded border" onClick={()=>onAdd({ weekday, start, end, venueAddress, note })}>Add slot</button>
      </div>
    </div>
  );
}

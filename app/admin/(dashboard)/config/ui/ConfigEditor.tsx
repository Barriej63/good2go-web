'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SettingsDoc } from './ConfigEditor.helpers';
import {
  addRegion, removeRegion,
  addVenue, removeVenue,
  addSlot, updateSlot, removeSlot,
  generateGridSlots, isValidHHMM
} from './ConfigEditor.helpers';

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type Props = { canEdit: boolean };

type SlotDef = {
  weekday: number;
  start: string;
  end: string;
  venueAddress?: string;
  note?: string;
};

export default function ConfigEditor({ canEdit }: Props) {
  // state
  const [cfg, setCfg] = useState<SettingsDoc>({ regions: [], slots: {}, venues: {} });
  const [region, setRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // generator controls
  const [gWeekday, setGWeekday] = useState(1);
  const [gStart, setGStart] = useState('17:30');
  const [gEnd, setGEnd] = useState('20:30');
  const [gStep, setGStep] = useState(10);
  const [gVenue, setGVenue] = useState('');

  /** Util: fresh load from server */
  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/config', { cache: 'no-store' });
      const j = await r.json();
      const loaded: SettingsDoc = {
        regions: j.regions || [],
        slots: j.slots || {},
        venues: j.venues || {},
      };
      setCfg(loaded);
      setRegion(prev => prev || loaded.regions[0] || '');
      setDirty(false);
    } catch (e) {
      console.error('load config failed', e);
      setError('Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Save regions + venues (not slots) to /api/admin/config */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      // We persist regions + venues as a document (your existing behavior).
      const payload: SettingsDoc = {
        regions: cfg.regions || [],
        venues: cfg.venues || {},
        // keep slots in memory/UI; slot CRUD is proxied live (see below)
        slots: cfg.slots || {},
      };
      const r = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Save failed');
      setDirty(false);
    } catch (e) {
      console.error(e);
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  /** Proxy helpers: live slot operations (writes to Firestore timeslots_<Region>) */
  async function proxyAddSlot(regionName: string, slot: SlotDef) {
    const r = await fetch('/api/admin/config/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: regionName, slot }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || 'add_slot_failed');
    }
  }

  async function proxyPatchSlot(regionName: string, index: number, patch: Partial<SlotDef>) {
    const r = await fetch('/api/admin/config/slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region: regionName, index, ...patch }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || 'patch_slot_failed');
    }
  }

  async function proxyRemoveSlot(regionName: string, index: number) {
    const r = await fetch(`/api/admin/config/slots?region=${encodeURIComponent(regionName)}&index=${index}`, {
      method: 'DELETE',
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || 'delete_slot_failed');
    }
  }

  const venues = useMemo(() => (cfg.venues?.[region] || []), [cfg, region]);
  const slots = useMemo(() => (cfg.slots?.[region] || []), [cfg, region]);

  const filteredVenues = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(v => v.toLowerCase().includes(q));
  }, [venues, filter]);

  const filteredSlots = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter(s =>
      `${DOW[s.weekday]} ${s.start}-${s.end} ${s.venueAddress || ''}`.toLowerCase().includes(q)
    );
  }, [slots, filter]);

  if (loading) return <div className="text-sm text-slate-600">Loading configuration…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Configuration</h1>
          <p className="text-xs text-slate-500">
            Manage regions, venues and timeslots. {dirty ? <span className="text-amber-700">Unsaved changes</span> : 'Up to date'}
          </p>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={e=>setFilter(e.target.value)}
            placeholder="Filter venues/slots…"
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={save}
            disabled={!canEdit || saving || !dirty}
            className={`btn ${(!canEdit || saving || !dirty) ? 'btn-ghost' : 'btn-primary'}`}
            title={!canEdit ? 'Only superadmins can save' : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Region selector + add */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Region</label>
            <select
              value={region}
              onChange={e=>setRegion(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              {(cfg.regions || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              disabled={!canEdit}
              className="btn btn-ghost"
              onClick={() => {
                const name = prompt('New region name?')?.trim();
                if (!name) return;
                setError(null);
                setCfg(prev => {
                  const next = addRegion(prev, name);
                  if (next !== prev) setDirty(true);
                  return next;
                });
                setRegion(name);
              }}
            >
              Add region
            </button>
            <button
              disabled={!canEdit || !region}
              className="btn btn-ghost"
              onClick={() => {
                if (!region) return;
                if (!confirm(`Remove region "${region}" and all its venues/slots?`)) return;
                setError(null);
                setCfg(prev => {
                  const next = removeRegion(prev, region);
                  if (next !== prev) setDirty(true);
                  return next;
                });
                setRegion((cfg.regions.find(r => r !== region) || '') as string);
              }}
            >
              Remove region
            </button>
          </div>
        </div>
      </section>

      {/* Venues */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Venues — {region || 'No region selected'}</h2>
          <div className="flex gap-2">
            <input
              placeholder="Add a new venue/address…"
              className="border rounded-lg px-3 py-2 text-sm"
              disabled={!canEdit || !region}
              value={gVenue}
              onChange={e=>setGVenue(e.target.value)}
            />
            <button
              className="btn btn-ghost"
              disabled={!canEdit || !region || !gVenue.trim()}
              onClick={() => {
                const v = gVenue.trim();
                if (!v) return;
                setError(null);
                setCfg(prev => {
                  const next = addVenue(prev, region, v);
                  if (next !== prev) setDirty(true);
                  return next;
                });
                setGVenue('');
              }}
            >
              Add venue
            </button>
          </div>
        </div>
        {!region ? (
          <p className="text-sm text-slate-500">Select a region first.</p>
        ) : filteredVenues.length ? (
          <ul className="list-disc pl-6 text-sm">
            {filteredVenues.map((v,i) => (
              <li key={`${v}-${i}`} className="flex items-center gap-3">
                <span>{v}</span>
                {canEdit && (
                  <button
                    onClick={() => {
                      setError(null);
                      setCfg(prev => {
                        const next = removeVenue(prev, region, v);
                        if (next !== prev) setDirty(true);
                        return next;
                      });
                    }}
                    className="text-rose-600 text-xs"
                  >
                    remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No venues {filter ? 'match the filter' : 'yet'}.</p>
        )}
      </section>

      {/* Generator — 10-min grid etc. */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="font-medium mb-3">Generate timeslots</h2>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Weekday</label>
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={gWeekday}
              onChange={e=>setGWeekday(Number(e.target.value))}
              disabled={!canEdit || !region}
            >
              {DOW.map((d,i)=><option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={gStart}
              onChange={e=>setGStart(e.target.value)}
              placeholder="HH:MM"
              disabled={!canEdit || !region}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Until</label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={gEnd}
              onChange={e=>setGEnd(e.target.value)}
              placeholder="HH:MM"
              disabled={!canEdit || !region}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Step (mins)</label>
            <input
              type="number"
              min={5}
              step={5}
              className="border rounded-lg px-3 py-2 w-full"
              value={gStep}
              onChange={e=>setGStep(parseInt(e.target.value || '10', 10))}
              disabled={!canEdit || !region}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Venue (optional)</label>
            <select
              className="border rounded-lg px-3 py-2 w-full mb-2"
              value={gVenue}
              onChange={e=>setGVenue(e.target.value)}
              disabled={!canEdit || !region}
            >
              <option value="">— choose venue —</option>
              {(cfg.venues?.[region] || []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="or type a custom venue…"
              value={gVenue}
              onChange={e=>setGVenue(e.target.value)}
              disabled={!canEdit || !region}
            />
          </div>

          <div className="sm:col-span-6">
            <button
              className="btn btn-primary"
              disabled={!canEdit || !region || !isValidHHMM(gStart) || !isValidHHMM(gEnd) || gStep <= 0}
              onClick={async () => {
                // Use your helper to create the in-memory slots (keeps UI consistent)
                setError(null);
                setCfg(prev => {
                  const next = generateGridSlots(prev, region, {
                    weekday: gWeekday,
                    windowStart: gStart,
                    windowEnd: gEnd,
                    stepMinutes: gStep,
                    venueAddress: gVenue || undefined,
                  });
                  if (next !== prev) setDirty(true);
                  return next;
                });

                // Persist live via proxy so Book page sees it
                // Generate same grid on the server by posting each slot.
                // To avoid index confusion, we reload after.
                try {
                  // naive client-side rebuild of the same grid for persistence
                  const toMinutes = (hhmm: string) => {
                    const [hh, mm] = hhmm.split(':').map(Number);
                    return hh * 60 + mm;
                  };
                  const startM = toMinutes(gStart);
                  const endM = toMinutes(gEnd);
                  const step = Math.max(5, gStep);
                  const gen: SlotDef[] = [];
                  for (let m = startM; m + step <= endM; m += step) {
                    const hh = Math.floor(m / 60);
                    const mm = m % 60;
                    const hh2 = Math.floor((m + step) / 60);
                    const mm2 = (m + step) % 60;
                    const pad = (n:number)=>String(n).padStart(2,'0');
                    gen.push({
                      weekday: gWeekday,
                      start: `${pad(hh)}:${pad(mm)}`,
                      end: `${pad(hh2)}:${pad(mm2)}`,
                      venueAddress: gVenue || undefined,
                    });
                  }
                  for (const s of gen) {
                    await proxyAddSlot(region, s);
                  }
                  await loadConfig();
                } catch (e:any) {
                  console.error(e);
                  setError(`Generate failed: ${e?.message || 'unknown_error'}`);
                }
              }}
            >
              Generate slots
            </button>
          </div>
        </div>
      </section>

      {/* Existing Slots (editable) */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Timeslots — {region || 'No region selected'}</h2>
          {canEdit && region && (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (!canEdit || !region) return;
                setError(null);
                // UI: add a blank slot locally
                setCfg(prev => {
                  const next = addSlot(prev, region);
                  if (next !== prev) setDirty(true);
                  return next;
                });
                // Backend: create a default 30m slot now so indices remain aligned.
                try {
                  await proxyAddSlot(region, {
                    weekday: 1,
                    start: '09:00',
                    end: '09:30',
                    venueAddress: '',
                  });
                  await loadConfig();
                } catch (e:any) {
                  console.error(e);
                  setError(`Add slot failed: ${e?.message || 'unknown_error'}`);
                }
              }}
            >
              Add single slot
            </button>
          )}
        </div>

        {!region ? (
          <p className="text-sm text-slate-500">Select a region first.</p>
        ) : filteredSlots.length ? (
          <div className="space-y-2">
            {filteredSlots.map((s, i) => {
              // Map back to true index in full slots list
              const trueIndex = slots.indexOf(s);

              // Local controlled inputs update UI immediately
              const onLocal = (patch: Partial<SlotDef>) => {
                setCfg(prev => {
                  const next = updateSlot(prev, region, trueIndex, patch);
                  if (next !== prev) setDirty(true);
                  return next;
                });
              };

              // Persist this row to server
              const onPersist = async () => {
                try {
                  await proxyPatchSlot(region, trueIndex, {
                    weekday: s.weekday,
                    start: s.start,
                    end: s.end,
                    venueAddress: s.venueAddress || '',
                  });
                  await loadConfig();
                } catch (e:any) {
                  console.error(e);
                  setError(`Update failed: ${e?.message || 'unknown_error'}`);
                }
              };

              return (
                <div key={`${region}-${trueIndex}`} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                  <select
                    disabled={!canEdit}
                    value={s.weekday}
                    onChange={e => onLocal({ weekday: Number(e.target.value) })}
                    className="border rounded-lg px-2 py-1"
                  >
                    {DOW.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
                  </select>

                  <input
                    disabled={!canEdit}
                    value={s.start}
                    onChange={e => onLocal({ start: e.target.value })}
                    className="border rounded-lg px-2 py-1"
                    placeholder="Start (HH:MM)"
                  />

                  <input
                    disabled={!canEdit}
                    value={s.end}
                    onChange={e => onLocal({ end: e.target.value })}
                    className="border rounded-lg px-2 py-1"
                    placeholder="End (HH:MM)"
                  />

                  <input
                    disabled={!canEdit}
                    value={s.venueAddress || ''}
                    onChange={e => onLocal({ venueAddress: e.target.value })}
                    className="border rounded-lg px-2 py-1 sm:col-span-2"
                    placeholder="Venue (optional)"
                  />

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onPersist}
                        className="btn btn-primary"
                        title="Save row"
                      >
                        Save
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await proxyRemoveSlot(region, trueIndex);
                            // Update local UI too
                            setCfg(prev => {
                              const next = removeSlot(prev, region, trueIndex);
                              if (next !== prev) setDirty(true);
                              return next;
                            });
                            await loadConfig();
                          } catch (e:any) {
                            console.error(e);
                            setError(`Remove failed: ${e?.message || 'unknown_error'}`);
                          }
                        }}
                        className="btn btn-ghost"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No timeslots {filter ? 'match the filter' : 'yet'}.</p>
        )}
      </section>
    </div>
  );
}

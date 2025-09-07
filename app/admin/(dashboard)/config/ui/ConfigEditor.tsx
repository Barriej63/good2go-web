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

export default function ConfigEditor({ canEdit }: Props) {
  // state
  const [cfg, setCfg] = useState<SettingsDoc>({ regions: [], slots: {}, venues: {} });
  const [region, setRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('');
  // generator controls
  const [gWeekday, setGWeekday] = useState(1);
  const [gStart, setGStart] = useState('17:30');
  const [gEnd, setGEnd] = useState('20:30');
  const [gStep, setGStep] = useState(10);
  const [gVenue, setGVenue] = useState('');

  // load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/admin/config', { cache: 'no-store' });
      const j = await r.json();
      const loaded: SettingsDoc = {
        regions: j.regions || [],
        slots: j.slots || {},
        venues: j.venues || {},
      };
      setCfg(loaded);
      setRegion(loaded.regions[0] || '');
      setLoading(false);
      setDirty(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const r = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (!r.ok) alert('Save failed');
    else setDirty(false);
  }

  function withDirty(fn: (prev: SettingsDoc) => SettingsDoc) {
    setCfg(prev => {
      const next = fn(prev);
      if (next !== prev) setDirty(true);
      return next;
    });
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
                withDirty(doc => addRegion(doc, name));
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
                withDirty(doc => removeRegion(doc, region));
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
                withDirty(doc => addVenue(doc, region, v));
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
                    onClick={() => withDirty(doc => removeVenue(doc, region, v))}
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
            {/* Allow typing a custom venue too */}
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
              onClick={() => {
                withDirty(doc => generateGridSlots(doc, region, {
                  weekday: gWeekday,
                  windowStart: gStart,
                  windowEnd: gEnd,
                  stepMinutes: gStep,
                  venueAddress: gVenue || undefined,
                }));
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
            <button className="btn btn-ghost" onClick={() => withDirty(doc => addSlot(doc, region))}>
              Add single slot
            </button>
          )}
        </div>

        {!region ? (
          <p className="text-sm text-slate-500">Select a region first.</p>
        ) : filteredSlots.length ? (
          <div className="space-y-2">
            {filteredSlots.map((s, i) => {
              const trueIndex = slots.indexOf(s);
              return (
                <div key={trueIndex} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                  <select
                    disabled={!canEdit}
                    value={s.weekday}
                    onChange={e => withDirty(doc => updateSlot(doc, region, trueIndex, { weekday: Number(e.target.value) }))}
                    className="border rounded-lg px-2 py-1"
                  >
                    {DOW.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
                  </select>

                  <input
                    disabled={!canEdit}
                    value={s.start}
                    onChange={e => withDirty(doc => updateSlot(doc, region, trueIndex, { start: e.target.value }))}
                    className="border rounded-lg px-2 py-1"
                    placeholder="Start (HH:MM)"
                  />

                  <input
                    disabled={!canEdit}
                    value={s.end}
                    onChange={e => withDirty(doc => updateSlot(doc, region, trueIndex, { end: e.target.value }))}
                    className="border rounded-lg px-2 py-1"
                    placeholder="End (HH:MM)"
                  />

                  <input
                    disabled={!canEdit}
                    value={s.venueAddress || ''}
                    onChange={e => withDirty(doc => updateSlot(doc, region, trueIndex, { venueAddress: e.target.value }))}
                    className="border rounded-lg px-2 py-1 sm:col-span-2"
                    placeholder="Venue (optional)"
                  />

                  {canEdit && (
                    <button
                      onClick={() => withDirty(doc => removeSlot(doc, region, trueIndex))}
                      className="btn btn-ghost"
                    >
                      Remove
                    </button>
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

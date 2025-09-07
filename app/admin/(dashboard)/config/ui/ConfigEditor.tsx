'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SettingsDoc } from './ConfigEditor.helpers';
import {
  addRegion, removeRegion,
  addVenue, removeVenue,
  addSlot, updateSlot, removeSlot,
} from './ConfigEditor.helpers';

const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type Props = { canEdit: boolean };

export default function ConfigEditor({ canEdit }: Props) {
  // ---------- state ----------
  const [cfg, setCfg] = useState<SettingsDoc>({ regions: [], slots: {}, venues: {} });
  const [region, setRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState(''); // quick search for venues/slots

  // ---------- load on mount ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/admin/config', { cache: 'no-store' });
      if (!r.ok) {
        setLoading(false);
        alert('Failed to load configuration.');
        return;
      }
      const j = await r.json();
      const loaded: SettingsDoc = {
        regions: j.regions || [],
        slots: j.slots || {},
        venues: j.venues || {},
      };
      setCfg(loaded);
      setRegion((loaded.regions[0] || ''));
      setLoading(false);
      setDirty(false);
    })();
  }, []);

  // ---------- save ----------
  async function save() {
    setSaving(true);
    const r = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (!r.ok) {
      const text = await r.text();
      alert(`Save failed: ${text || r.status}`);
      return;
    }
    setDirty(false);
  }

  // ---------- derived ----------
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

  // ---------- helpers that also set dirty ----------
  function withDirty<T>(fn: (prev: SettingsDoc) => SettingsDoc) {
    setCfg(prev => {
      const next = fn(prev);
      if (next !== prev) setDirty(true);
      return next;
    });
  }

  // ---------- UI ----------
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

      {/* Regions */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Regions</h2>
          <div className="flex gap-2">
            {canEdit && (
              <button
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
            )}
            {canEdit && region && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  if (!confirm(`Remove region "${region}"? This removes its venues and slots.`)) return;
                  withDirty(doc => removeRegion(doc, region));
                  setRegion((cfg.regions.find(r => r !== region) || '') as string);
                }}
              >
                Remove current
              </button>
            )}
          </div>
        </div>

        {cfg.regions.length ? (
          <div className="flex flex-wrap gap-2">
            {cfg.regions.map(r => (
              <button
                key={r}
                onClick={()=>setRegion(r)}
                className={`px-3 py-1 rounded-full text-sm ${r===region ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                {r}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No regions yet. {canEdit && 'Use “Add region” to create one.'}</p>
        )}
      </section>

      {/* Venues */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Venues — {region || 'No region selected'}</h2>
          {canEdit && region && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                const v = prompt('New venue/address?')?.trim();
                if (!v) return;
                withDirty(doc => addVenue(doc, region, v));
              }}
            >
              Add venue
            </button>
          )}
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

      {/* Timeslots */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Timeslots — {region || 'No region selected'}</h2>
          {canEdit && region && (
            <button
              className="btn btn-ghost"
              onClick={() => withDirty(doc => addSlot(doc, region))}
            >
              Add slot
            </button>
          )}
        </div>

        {!region ? (
          <p className="text-sm text-slate-500">Select a region first.</p>
        ) : filteredSlots.length ? (
          <div className="space-y-2">
            {filteredSlots.map((s, i) => {
              // map index back to the true index in cfg.slots[region]
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


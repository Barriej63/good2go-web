'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SettingsDoc } from './ConfigEditor.helpers';
import {
  addRegion, removeRegion,
  addVenue, removeVenue,
  addSlot, updateSlot, removeSlot,
  isValidHHMM,
  netAddSlot, netPatchSlot, netRemoveSlot
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

/** Small helpers */
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h*60 + m;
};
const fromMin = (m: number) => {
  const h = Math.floor(m/60), mm = m%60;
  return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
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

  // generator controls (no "Until", generate ONE slot of Step minutes)
  const [gWeekday, setGWeekday] = useState(1);
  const [gStart, setGStart] = useState('17:30');
  const [gStep, setGStep] = useState(10);
  const [gVenue, setGVenue] = useState('');

  /** Load regions/venues + server slots and merge into editor state */
  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      // 1) regions/venues (your existing config doc)
      const r1 = await fetch('/api/admin/config', { cache: 'no-store' });
      const j1 = await r1.json();

      // 2) timeslots from guarded admin endpoint (docs: timeslots_<Region>)
      const r2 = await fetch('/api/admin/slots', {
        headers: { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_TOKEN || '' },
        cache: 'no-store'
      });
      const j2 = await r2.json();

      // Build slots map from docs
      const slotsMap: Record<string, SlotDef[]> = {};
      if (Array.isArray(j2?.docs)) {
        for (const d of j2.docs) {
          const id: string = d?.id || '';
          // expects "timeslots_<Region>"
          const match = id.match(/^timeslots[_-](.+)$/i);
          if (!match) continue;
          const reg = match[1];
          const arr = Array.isArray(d?.data?.slots) ? d.data.slots : [];
          // light dedupe by composite key to avoid accidental doubles
          const seen = new Set<string>();
          const cleaned: SlotDef[] = [];
          for (const s of arr) {
            const wd = Number(s?.weekday ?? 0);
            const start = String(s?.start || '');
            const end = String(s?.end || '');
            const venueAddress = s?.venueAddress ? String(s.venueAddress) : '';
            if (!isValidHHMM(start) || !isValidHHMM(end)) continue;
            const key = `${wd}|${start}|${end}|${venueAddress}`;
            if (seen.has(key)) continue;
            seen.add(key);
            cleaned.push({ weekday: wd, start, end, venueAddress });
          }
          slotsMap[reg] = cleaned;
        }
      }

      const loaded: SettingsDoc = {
        regions: Array.isArray(j1?.regions) ? j1.regions : [],
        venues: (j1?.venues && typeof j1.venues === 'object') ? j1.venues : {},
        slots: slotsMap
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

  /** Save regions + venues (timeslots are managed live via admin/slots) */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: SettingsDoc = {
        regions: cfg.regions || [],
        venues: cfg.venues || {},
        // slots in this POST are ignored by your current API;
        // we keep them so state is complete locally.
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

  /** Stable rows with real server indices (avoid indexOf-reference traps) */
  const slots = useMemo(() => (cfg.slots?.[region] || []), [cfg, region]);
  const rows = useMemo(() => {
    const list = slots.map((s, idx) => ({ s, idx }));
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ s }) =>
      `${DOW[s.weekday]} ${s.start}-${s.end} ${s.venueAddress || ''}`.toLowerCase().includes(q)
    );
  }, [slots, filter]);

  const venues = useMemo(() => (cfg.venues?.[region] || []), [cfg, region]);
  const filteredVenues = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(v => v.toLowerCase().includes(q));
  }, [venues, filter]);

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
                setCfg(prev => { const next = addRegion(prev, name); if (next!==prev) setDirty(true); return next; });
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
                setCfg(prev => { const next = removeRegion(prev, region); if (next!==prev) setDirty(true); return next; });
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
                setCfg(prev => { const next = addVenue(prev, region, v); if (next!==prev) setDirty(true); return next; });
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
                      setCfg(prev => { const next = removeVenue(prev, region, v); if (next!==prev) setDirty(true); return next; });
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

      {/* Generator — ONE slot: From + Step (mins) */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="font-medium mb-3">Generate timeslot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
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

          <div className="sm:col-span-5">
            <button
              className="btn btn-primary"
              disabled={!canEdit || !region || !isValidHHMM(gStart) || gStep <= 0}
              onClick={async () => {
                setError(null);
                try {
                  const startM = toMin(gStart);
                  const end = fromMin(startM + Math.max(5, gStep));
                  await netAddSlot(region, {
                    weekday: gWeekday,
                    start: gStart,
                    end,
                    venueAddress: gVenue || ''
                  });
                  await loadConfig();
                } catch (e:any) {
                  console.error(e);
                  setError(`Generate failed: ${e?.message || 'unknown_error'}`);
                }
              }}
            >
              Generate slot
            </button>
          </div>
        </div>
      </section>

      {/* Existing Slots (editable, with stable indices) */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Timeslots — {region || 'No region selected'}</h2>
          {canEdit && region && (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                if (!canEdit || !region) return;
                setError(null);
                try {
                  await netAddSlot(region, { weekday: 1, start: '09:00', end: '09:30', venueAddress: '' });
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
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map(({ s, idx }) => {
              const onLocal = (patch: Partial<SlotDef>) => {
                setCfg(prev => {
                  const next = updateSlot(prev, region, idx, patch);
                  if (next !== prev) setDirty(true);
                  return next;
                });
              };
              const onPersist = async () => {
                try {
                  await netPatchSlot(region, idx, {
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
                <div key={`${region}-${idx}`} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                  <select
                    disabled={!canEdit}
                    value={s.weekday}
                    onChange={e => onLocal({ weekday: Number(e.target.value) })}
                    className="border rounded-lg px-2 py-1"
                  >
                    {DOW.map((d, w) => <option key={d} value={w}>{d}</option>)}
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
                      <button onClick={onPersist} className="btn btn-primary">Save</button>
                      <button
                        onClick={async () => {
                          try {
                            await netRemoveSlot(region, idx);
                            setCfg(prev => { const next = removeSlot(prev, region, idx); if (next!==prev) setDirty(true); return next; });
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

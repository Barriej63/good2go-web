'use client';

import { useEffect, useState } from 'react';

type ConfigDoc = { regions: string[]; timeslots: string[] };

export default function ConfigPage() {
  const [cfg, setCfg] = useState<ConfigDoc>({ regions: [], timeslots: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/admin/config');
      const j = await r.json();
      setCfg({ regions: j.regions || [], timeslots: j.timeslots || [] });
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuration</h1>

      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="font-medium mb-2">Regions</h2>
        <textarea
          className="w-full border rounded-lg p-2 leading-6 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          rows={4}
          value={(cfg.regions || []).join('\n')}
          onChange={e => setCfg(s => ({ ...s, regions: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) }))}
        />
        <p className="text-xs text-slate-500 mt-2">One region per line.</p>
      </section>

      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="font-medium mb-2">Timeslots</h2>
        <textarea
          className="w-full border rounded-lg p-2 leading-6 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          rows={6}
          value={(cfg.timeslots || []).join('\n')}
          onChange={e => setCfg(s => ({ ...s, timeslots: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) }))}
        />
        <p className="text-xs text-slate-500 mt-2">One timeslot per line.</p>
      </section>

      <div>
        <button onClick={save} disabled={saving} className="btn btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

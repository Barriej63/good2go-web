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
    <div>
      <h1 className="text-xl font-semibold mb-4">Configuration</h1>
      {loading ? <p>Loading…</p> : (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium mb-2">Regions</h2>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={(cfg.regions || []).join('\n')}
              onChange={e => setCfg(s => ({ ...s, regions: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) }))}
            />
            <p className="text-sm text-gray-500 mt-1">One region per line.</p>
          </div>

          <div>
            <h2 className="font-medium mb-2">Timeslots</h2>
            <textarea
              className="w-full border rounded p-2"
              rows={6}
              value={(cfg.timeslots || []).join('\n')}
              onChange={e => setCfg(s => ({ ...s, timeslots: e.target.value.split('\n').map(v => v.trim()).filter(Boolean) }))}
            />
            <p className="text-sm text-gray-500 mt-1">One timeslot per line.</p>
          </div>

          <button onClick={save} disabled={saving} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

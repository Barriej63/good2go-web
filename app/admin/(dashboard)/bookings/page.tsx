// /app/admin/(dashboard)/bookings/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Booking = {
  id: string;
  createdAt?: string;
  name?: string;
  email?: string;
  region?: string;
  slot?: string;
  dateISO?: string;
  start?: string;
  end?: string;
  venueAddress?: string;
  reminderSent?: boolean;
  reminderSentAt?: string;
};

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/bookings');
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function sendReminders() {
    setReminding(true);
    const r = await fetch('/api/admin/reminders', { method: 'POST' });
    if (r.ok) {
      await load();
      alert('Reminder job executed. (It only sends for bookings ~24h away.)');
    } else {
      alert('Reminder job failed to run.');
    }
    setReminding(false);
  }

  function downloadCSV() {
    const cols = ['createdAt','name','email','region','dateISO','start','end','venueAddress','slot','reminderSent','reminderSentAt','id'];
    const rows = [cols.join(',')].concat(
      items.map(b => cols.map(c => (String((b as any)[c] ?? '').replace(/"/g,'""')))).map(arr => arr.map(v => `"${v}"`).join(','))
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const countSent = useMemo(() => items.filter(i => i.reminderSent).length, [items]);

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-xs text-slate-500">{items.length} total · {countSent} with reminders sent</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn btn-ghost">Export CSV</button>
          <button onClick={sendReminders} disabled={reminding} className="btn btn-primary">
            {reminding ? 'Running…' : 'Send reminders now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : items.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Email</th>
                <th className="px-3 py-2 text-left font-medium">Region</th>
                <th className="px-3 py-2 text-left font-medium">Slot</th>
                <th className="px-3 py-2 text-left font-medium">Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{b.createdAt || ''}</td>
                  <td className="px-3 py-2">{b.name || ''}</td>
                  <td className="px-3 py-2">{b.email || ''}</td>
                  <td className="px-3 py-2">{b.region || ''}</td>
                  <td className="px-3 py-2">{b.slot || (b.dateISO && b.start ? `${b.dateISO} ${b.start}` : '')}</td>
                  <td className="px-3 py-2">
                    {b.reminderSent
                      ? <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">Sent</span>
                      : <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs">Pending</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-slate-600">No bookings yet.</div>
      )}
    </section>
  );
}

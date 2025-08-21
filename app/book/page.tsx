'use client';

import { useEffect, useState } from 'react';

type Product = { id: string; name: string; priceCents: number; active: boolean };
type Slot = { weekday: string; start: string; end: string; venueAddress?: string; note?: string };

const REGIONS = ['Auckland', 'Waikato', 'Bay of Plenty']; // adjust as needed

const weekdayOfDate = (isoDate: string) => {
  const d = new Date(isoDate + 'T00:00:00');
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][d.getDay()];
};

export default function BookPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [region, setRegion] = useState('Auckland'); // default to region with slots
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState('');             // YYYY-MM-DD
  const [slotJson, setSlotJson] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const minDate = today.toISOString().slice(0, 10);
  const maxDate = new Date(today.getTime() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10); // +60 days

  async function loadProducts() {
    try {
      setError(null);
      const res = await fetch('/api/public/products', { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load products');
      setProducts(data.products || []);
      setProductId(data.products?.[0]?.id || '');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadSlots(reg: string) {
    try {
      setError(null);
      const res = await fetch('/api/public/timeslots?region=' + encodeURIComponent(reg), { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load timeslots');
      setAllSlots(data.slots || []);
      setSlotJson('');
    } catch (e: any) {
      setAllSlots([]);
      setSlotJson('');
      setError(e.message);
    }
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadSlots(region); }, [region]);

  // Only show slots whose weekday matches the chosen date
  const visibleSlots = date
    ? allSlots.filter(s => (s.weekday || '').toLowerCase() === weekdayOfDate(date))
    : [];

  async function submit() {
    setError(null);
    if (!productId || !region || !date || !slotJson || !name || !email) {
      setError('Please complete all fields.'); return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/worldline/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          region,
          date,                      // include chosen date
          slot: JSON.parse(slotJson),
          name,
          email,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (e: any) {
      setError(e.message || 'Payment setup failed.');
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find(p => p.id === productId);

  return (
    <section style={{ maxWidth: 640, margin: '24px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>Book a Good2Go Session</h1>

      <label>Product<br />
        <select value={productId} onChange={e => setProductId(e.target.value)} style={{ width: '100%' }}>
          {products.length === 0 && <option value="">Loading…</option>}
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — ${(p.priceCents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <div style={{ height: 12 }} />

      <label>Region<br />
        <select value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%' }}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <div style={{ height: 12 }} />

      <label>Date<br />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
               min={minDate} max={maxDate} style={{ width: '100%' }} />
      </label>

      <div style={{ height: 12 }} />

      <label>Time Slot {date ? '' : '(choose a date first)'}<br />
        <select value={slotJson} onChange={e => setSlotJson(e.target.value)} style={{ width: '100%' }} disabled={!date}>
          <option value="">
            {date ? (visibleSlots.length ? 'Select…' : 'No slots for this date') : '- @ TBC'}
          </option>
          {visibleSlots.map((s, i) => (
            <option key={i} value={JSON.stringify(s)}>
              {s.start}-{s.end} @ {s.venueAddress || 'TBC'}
            </option>
          ))}
        </select>
      </label>

      <div style={{ height: 12 }} />

      <label>Full Name<br />
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
      </label>

      <div style={{ height: 12 }} />

      <label>Email<br />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%' }} />
      </label>

      {selected && <p style={{ marginTop: 12 }}><b>Total:</b> ${(selected.priceCents / 100).toFixed(2)}</p>}
      {error && <p style={{ color: '#b00' }}>{error}</p>}

      <button onClick={submit} disabled={loading || !productId || !date || !slotJson}
              style={{ marginTop: 12, padding: '8px 14px' }}>
        {loading ? 'Processing…' : 'Proceed to Payment'}
      </button>

      <p style={{ marginTop: 16, color: '#666' }}>You’ll be redirected to Worldline (Paymark Click) to complete payment.</p>
    </section>
  );
}

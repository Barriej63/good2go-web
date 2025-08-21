'use client';

import { useEffect, useState } from 'react';

type Product = { id: string; name: string; priceCents: number; active: boolean };
type Slot = { weekday: string; start: string; end: string; venueAddress?: string; note?: string };

const REGIONS = ['Auckland', 'Waikato', 'Bay of Plenty']; // edit as needed

export default function BookPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [region, setRegion] = useState('Auckland');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotJson, setSlotJson] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProducts() {
    setError(null);
    try {
      const res = await fetch('/api/public/products', { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load products');
      setProducts(data.products || []);
      setProductId((data.products?.[0]?.id) || '');
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function loadSlots(reg: string) {
    setError(null);
    try {
      const res = await fetch(`/api/public/timeslots?region=${encodeURIComponent(reg)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load timeslots');
      setSlots(data.slots || []);
      setSlotJson('');
    } catch (e: any) {
      setError(e.message);
      setSlots([]);
      setSlotJson('');
    }
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadSlots(region); }, [region]);

  async function submit() {
    setError(null);
    if (!productId || !region || !slotJson || !name || !email) {
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
          slot: JSON.parse(slotJson), // {weekday,start,end,venueAddress?}
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
    <section style={{maxWidth: 640, margin: '24px auto', padding: 16}}>
      <h1 style={{marginBottom: 16}}>Book a Good2Go Session</h1>

      <label>Product<br/>
        <select value={productId} onChange={e => setProductId(e.target.value)} style={{width:'100%'}}>
          {products.length === 0 && <option value="">Loading…</option>}
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — ${(p.priceCents/100).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <div style={{height:12}} />

      <label>Region<br/>
        <select value={region} onChange={e => setRegion(e.target.value)} style={{width:'100%'}}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <div style={{height:12}} />

      <label>Time Slot<br/>
        <select value={slotJson} onChange={e => setSlotJson(e.target.value)} style={{width:'100%'}}>
          <option value="">{slots.length ? 'Select…' : 'No slots available'}</option>
          {slots.map((s, i) => (
            <option key={i} value={JSON.stringify(s)}>
              {s.weekday} {s.start}-{s.end} @ {s.venueAddress || 'TBC'}
            </option>
          ))}
        </select>
      </label>

      <div style={{height:12}} />

      <label>Full Name<br/>
        <input value={name} onChange={e => setName(e.target.value)} style={{width:'100%'}} />
      </label>

      <div style={{height:12}} />

      <label>Email<br/>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{width:'100%'}} />
      </label>

      {selected && <p style={{marginTop:12}}><b>Total:</b> ${(selected.priceCents/100).toFixed(2)}</p>}
      {error && <p style={{color:'#b00'}}>{error}</p>}

      <button onClick={submit} disabled={loading || !productId || !slotJson}
              style={{marginTop:12, padding:'8px 14px'}}>
        {loading ? 'Processing…' : 'Proceed to Payment'}
      </button>

      <p style={{marginTop:16, color:'#666'}}>You’ll be redirected to Worldline (Paymark Click) to complete payment.</p>
    </section>
  );
}


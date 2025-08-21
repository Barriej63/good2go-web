'use client';
import { useEffect, useState } from 'react';
import { z } from 'zod';

const REGIONS = ['Auckland', 'Waikato', 'Bay of Plenty'];

const FormSchema = z.object({
  productId: z.string().min(1),
  region: z.string().min(1),
  slot: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
});

type Slot = { weekday: string; start: string; end: string; venueAddress?: string; note?: string };
type Product = { id:string; name:string; priceCents:number; active:boolean; };

export default function BookPage() {
  const [region, setRegion] = useState('Waikato');
  const [slots, setSlots] = useState<{label:string,value:string}[]>([]);
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    try {
      const res = await fetch('/api/public/products', { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load products');
      const list: Product[] = data.products || [];
      setProducts(list);
      setProductId(list[0]?.id || '');
    } catch (e:any) {
      console.error(e);
      setError(e.message);
    }
  }

  async function loadSlots(reg: string) {
    setError(null);
    try {
      const res = await fetch('/api/public/timeslots?region=' + encodeURIComponent(reg), { cache: 'no-store' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load timeslots');
      const opts = (data.slots || []).map((s: Slot) => ({
        label: `${s.weekday} ${s.start}-${s.end} @ ${s.venueAddress || 'TBC'}`,
        value: JSON.stringify(s),
      }));
      setSlots(opts);
      setSlot('');
    } catch (e:any) {
      console.error(e);
      setSlots([]);
      setError(e.message);
    }
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { loadSlots(region); }, [region]);

  async function submit() {
    setError(null);
    const parsed = FormSchema.safeParse({ productId, region, slot, name, email });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Check the form.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/worldline/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId,
          region, 
          slot: JSON.parse(slot), 
          name, 
          email 
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (e:any) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find(p=>p.id===productId);

  return (
    <section>
      <h2>Book a Session</h2>
      <label>Product<br/>
        <select value={productId} onChange={e=>setProductId(e.target.value)}>
          {products.length === 0 && <option value="">Loading…</option>}
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} — ${(p.priceCents/100).toFixed(2)}</option>
          ))}
        </select>
      </label>
      <br/>
      <label>Region<br/>
        <select value={region} onChange={e=>setRegion(e.target.value)}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <br/>
      <label>Time Slot<br/>
        <select value={slot} onChange={e=>setSlot(e.target.value)}>
          <option value="">{slots.length ? 'Select…' : 'No slots available'}</option>
          {slots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
      <br/>
      <label>Full Name<br/>
        <input value={name} onChange={e=>setName(e.target.value)} />
      </label>
      <br/>
      <label>Email<br/>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      </label>
      <br/>
      {selected && <p><b>Total:</b> ${(selected.priceCents/100).toFixed(2)}</p>}
      {error && <p style={{color:'#b00'}}>{error}</p>}
      <button onClick={submit} disabled={loading || !productId || !slot}>{loading ? 'Processing…' : 'Proceed to Payment'}</button>
      <p style={{marginTop:16, color:'#777'}}>You will be redirected to a secure Worldline (Paymark Click) payment page.</p>
    </section>
  );
}

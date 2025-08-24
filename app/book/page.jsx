'use client';
import { useState } from 'react';

export default function BookPage() {
  const [selectedProduct, setSelectedProduct] = useState('baseline');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      name,
      email,
      product: selectedProduct,
      consentAccepted: true,
    };

    const r = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) throw new Error(data?.error || 'Booking failed');

    const bookingRef = data.bookingRef;   // store first
    const isPackage = selectedProduct === 'package';
    const amount = isPackage ? 19900 : 6500;   // cents

    // redirect to payment redirect page
    window.location.href = `/pay/redirect?ref=${encodeURIComponent(bookingRef)}&amount=${amount}`;
  }

  return (
    <div style={{padding:'2rem'}}>
      <h1>Book a Good2Go Assessment</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Your Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label>Your Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Product</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
            <option value="baseline">Baseline — $65</option>
            <option value="package">Package (4 weekly sessions) — $199</option>
          </select>
        </div>
        <button type="submit">Proceed</button>
      </form>
    </div>
  );
}

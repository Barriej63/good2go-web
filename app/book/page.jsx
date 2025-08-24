// app/book/page.jsx
'use client';

export default function BookPage() {
  async function handleBook() {
    const payload = { name:'Test' };
    const r = await fetch('/api/book', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) {
      alert('Booking failed: '+(data?.error||''));
      return;
    }
    const isPackage = false; // replace with actual flag
    const amount = isPackage ? 19900 : 6500;
    window.location.href = `/pay/redirect?ref=${encodeURIComponent(data.bookingRef)}&amount=${amount}`;
  }

  return <button onClick={handleBook}>Book Now</button>;
}

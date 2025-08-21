'use client';
import { useEffect, useState } from 'react';
import { db } from '@/src/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'bookings'));
      const snap = await getDocs(q);
      setBookings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    }
    load();
  }, []);

  return (
    <section>
      <h2>Admin Bookings</h2>
      <p style={{color:'#a00'}}>⚠️ Add real auth & role checks before production.</p>
      <ul>
        {bookings.map((b:any) => (
          <li key={b.id}>
            <b>{b.name}</b> — {b.email} — {b.region} — {b.slot?.weekday} {b.slot?.start}-{b.slot?.end} @ {b.slot?.venueAddress} — <i>{b.status}</i> — {b.product?.name} ${(b.amount/100).toFixed(2)}
          </li>
        ))}
      </ul>
    </section>
  );
}

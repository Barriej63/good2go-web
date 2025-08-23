import React from 'react';
import { getAdminDb } from '@/lib/firebaseAdmin';
import SuccessDetails from '@/components/SuccessDetails';

export const dynamic = 'force-dynamic';

async function getBookingByBid(bid) {
  if (!bid) return null;
  const db = getAdminDb();
  const snap = await db.collection('bookings').where('bid', '==', bid).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export default async function SuccessPage({ searchParams }) {
  const bid = searchParams?.bid || searchParams?.ref || null;
  const booking = await getBookingByBid(bid);

  return (
    <main className="px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">✅ Booking Successful</h1>
      {!booking && (
        <p className="text-red-600 mb-6">
          We couldn't locate your booking details yet. Your reference is <strong>{bid || '—'}</strong>.
          If you just completed payment, please refresh in a moment or contact support.
        </p>
      )}
      {booking ? (
        <>
          <p className="mb-6 text-gray-700">Thank you! Your booking has been confirmed. A confirmation email has been sent (if you provided an address).</p>
          <SuccessDetails booking={booking} />
        </>
      ) : (
        <p className="mb-6 text-gray-700">A confirmation email has been sent (if you provided an address).</p>
      )}
    </main>
  );
}

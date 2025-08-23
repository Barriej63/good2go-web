import React from 'react';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

async function getBookingByBid(bid) {
  if (!bid) return null;
  const db = getAdminDb();
  const snap = await db.collection('bookings').where('bid', '==', bid).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export default async function ReceiptPage({ searchParams }) {
  const bid = searchParams?.bid || null;
  const booking = await getBookingByBid(bid);

  const dt = booking?.dateTime
    ? new Date(booking.dateTime.seconds ? booking.dateTime.seconds * 1000 : booking.dateTime)
    : null;

  return (
    <html>
      <head>
        <title>Receipt {bid ? `• ${bid}` : ''}</title>
        <meta name="robots" content="noindex" />
        <style>{`
          @media print { .no-print { display: none } }
          body { font-family: ui-sans-serif, system-ui, -apple-system; padding: 24px; }
          .card { max-width: 680px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { padding: 6px 0; vertical-align: top; }
          td:first-child { width: 160px; font-weight: 600; color: #374151; }
          .actions { margin-top: 16px; display: flex; gap: 12px; }
          .btn { border: 1px solid #111827; padding: 8px 14px; border-radius: 10px; text-decoration: none; color: #111827; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <h1>Good2Go Booking Receipt</h1>
          <div>Reference: <strong>{bid || '—'}</strong></div>
          {!booking && <p style={{color:'#b91c1c'}}>Booking not found. Please try again later or contact support.</p>}
          {booking && (
            <table>
              <tbody>
                <tr><td>Product</td><td>{booking.product || 'Good2Go Assessment'}</td></tr>
                <tr><td>Name</td><td>{booking.name || booking.customerName || '—'}</td></tr>
                <tr><td>Region</td><td>{booking.region || '—'}</td></tr>
                <tr><td>Date</td><td>{dt ? dt.toLocaleDateString() : '—'}</td></tr>
                <tr><td>Time</td><td>{dt ? dt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '—'}</td></tr>
                <tr><td>Amount</td><td>{booking.amount ? `$${(booking.amount/100).toFixed(2)}` : '—'}</td></tr>
                <tr><td>Payment</td><td>{booking.paymentStatus || 'Paid'}</td></tr>
                {booking.venue && (<tr><td>Venue</td><td style={{whiteSpace:'pre-wrap'}}>{booking.venue}</td></tr>)}
                {booking.notes && (<tr><td>Notes</td><td style={{whiteSpace:'pre-wrap'}}>{booking.notes}</td></tr>)}
              </tbody>
            </table>
          )}
          <div className="actions no-print">
            <a className="btn" href={`/api/ics?bid=${encodeURIComponent(bid || '')}`}>Download .ics</a>
            <button className="btn" onClick={() => window.print()}>Print</button>
            <a className="btn" href="/">Home</a>
          </div>
        </div>
      </body>
    </html>
  );
}

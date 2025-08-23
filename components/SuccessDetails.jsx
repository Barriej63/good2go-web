'use client';
import React from 'react';

export default function SuccessDetails({ booking }) {
  if (!booking) return null;
  const dt = booking?.dateISO ? new Date(booking.dateISO) :
           booking?.dateTime?.seconds ? new Date(booking.dateTime.seconds*1000) :
           booking?.dateTime ? new Date(booking.dateTime) : null;

  return (
    <div className="max-w-xl rounded-2xl shadow p-6 bg-white">
      <h2 className="text-2xl font-semibold mb-4">Booking Details</h2>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <dt className="font-medium col-span-1">Reference</dt><dd className="col-span-2">{booking.bid}</dd>
        <dt className="font-medium col-span-1">Product</dt><dd className="col-span-2">{booking.product || 'Good2Go Assessment'}</dd>
        <dt className="font-medium col-span-1">Name</dt><dd className="col-span-2">{booking.name || booking.customerName || '—'}</dd>
        <dt className="font-medium col-span-1">Region</dt><dd className="col-span-2">{booking.region || '—'}</dd>
        <dt className="font-medium col-span-1">Date</dt><dd className="col-span-2">{dt ? dt.toLocaleDateString() : '—'}</dd>
        <dt className="font-medium col-span-1">Time</dt><dd className="col-span-2">{booking.start && booking.end ? `${booking.start}–${booking.end}` : '—'}</dd>
        <dt className="font-medium col-span-1">Medical Email</dt><dd className="col-span-2">{booking.medicalEmail || '—'}</dd>
        <dt className="font-medium col-span-1">Venue</dt><dd className="col-span-2 whitespace-pre-wrap">{booking.venue || booking.venueAddress || '—'}</dd>
        {booking.notes && (<><dt className="font-medium col-span-1">Notes</dt><dd className="col-span-2 whitespace-pre-wrap">{booking.notes}</dd></>)}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`/api/ics?bid=${encodeURIComponent(booking.bid)}`} className="px-4 py-2 rounded-xl bg-black text-white">Add to Calendar (.ics)</a>
        <a href={`/success/receipt?bid=${encodeURIComponent(booking.bid)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl border">Print receipt</a>
        <a href="/" className="px-4 py-2 rounded-xl border">Return to Home</a>
      </div>
    </div>
  );
}

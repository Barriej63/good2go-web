'use client';
import React from 'react';

export default function SuccessDetails({ booking }) {
  if (!booking) return null;
  const parseDate = () => {
    if (booking.dateISO) return new Date(booking.dateISO + 'T00:00:00');
    if (booking.dateTime?.seconds) return new Date(booking.dateTime.seconds * 1000);
    return null;
  };
  const dt = parseDate();
  return (
    <div className="max-w-xl rounded-2xl shadow p-6 bg-white">
      <h2 className="text-2xl font-semibold mb-4">Booking Details</h2>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <dt className="font-medium">Reference</dt><dd className="col-span-2">{booking.bookingRef || booking.bid}</dd>
        <dt className="font-medium">Region</dt><dd className="col-span-2">{booking.region || '—'}</dd>
        <dt className="font-medium">Date</dt><dd className="col-span-2">{dt ? dt.toLocaleDateString() : '—'}</dd>
        <dt className="font-medium">Time</dt><dd className="col-span-2">{booking.start && booking.end ? `${booking.start}–${booking.end}` : booking.time || '—'}</dd>
        <dt className="font-medium">Venue</dt><dd className="col-span-2">{booking.venueAddress || booking.venue || '—'}</dd>
        <dt className="font-medium">Medical Email</dt><dd className="col-span-2">{booking.medicalEmail || '—'}</dd>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`/api/ics?bid=${encodeURIComponent(booking.bookingRef || booking.bid || '')}`} className="px-4 py-2 rounded-xl bg-black text-white">Add to Calendar (.ics)</a>
        <a href={`/success/receipt?bid=${encodeURIComponent(booking.bookingRef || booking.bid || '')}`} target="_blank" rel="noopener" className="px-4 py-2 rounded-xl border">Print receipt</a>
        <a href="/" className="px-4 py-2 rounded-xl border">Home</a>
      </div>
    </div>
  );
}

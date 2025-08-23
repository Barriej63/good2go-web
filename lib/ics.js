/**
 * Build an RFC 5545 compliant ICS string from a booking.
 * Expecting:
 *   - product, venue, region, name, amount
 *   - dateTime: JS timestamp or Firestore Timestamp
 *   - bid
 */
function formatDateUTC(dt) {
  // dt is a JS Date
  const pad = (n) => String(n).padStart(2, '0');
  return (
    dt.getUTCFullYear().toString() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) + 'T' +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) + 'Z'
  );
}

export function bookingToICS(booking) {
  if (!booking) throw new Error('Missing booking');
  const start = booking?.dateTime?.seconds
    ? new Date(booking.dateTime.seconds * 1000)
    : new Date(booking.dateTime);

  // Default to 60 minutes if no explicit duration
  const durationMinutes = booking.durationMinutes || 60;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const uid = `good2go-${booking.bid}@good2go-rth.com`;
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Good2Go//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateUTC(now)}`,
    `DTSTART:${formatDateUTC(start)}`,
    `DTEND:${formatDateUTC(end)}`,
    `SUMMARY:${(booking.product || 'Good2Go Assessment').replace(/\\n/g, ' ')}`,
    `LOCATION:${[(booking.venue || ''), (booking.region || '')].filter(Boolean).join(' - ').replace(/\\n/g, ', ')}`,
    `DESCRIPTION:${(`Name: ${booking.name || booking.customerName || ''}\\nReference: ${booking.bid}\\nRegion: ${booking.region || ''}\\nAmount: ${booking.amount ? '$' + (booking.amount/100).toFixed(2) : ''}\\nNotes: ${(booking.notes || '').replace(/\\n/g, ' ')}`).replace(/[\\r\\n]+/g, '\\\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // Ensure CRLF per spec
  return lines.join('\\r\\n');
}

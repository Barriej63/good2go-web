import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { bookingToICS } from '@/lib/ics';

async function getBookingByBid(bid) {
  const db = getAdminDb();
  const snap = await db.collection('bookings').where('bid', '==', bid).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const bid = searchParams.get('bid');
  if (!bid) {
    return new NextResponse('Missing bid', { status: 400 });
  }
  const booking = await getBookingByBid(bid);
  if (!booking) {
    return new NextResponse('Booking not found', { status: 404 });
  }

  const ics = bookingToICS(booking);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="good2go-${bid}.ics"`,
      'Cache-Control': 'no-cache',
    }
  });
}

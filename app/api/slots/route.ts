import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * Returns public booking config:
 * {
 *   regions: ['Auckland','Waikato','Bay of Plenty'],
 *   slots: {
 *     'Auckland': [{ weekday: 2, start: '17:30', end: '18:30' }], // Tuesday
 *     'Waikato':  [{ weekday: 2, start: '17:30', end: '18:30' }],
 *     'Bay of Plenty': [{ weekday: 4, start: '11:00', end: '12:00' }] // Thursday
 *   }
 * }
 */
export async function GET() {
  try {
    const db = getAdminDb();
    // Optional Firestore config at booking_config/public
    const doc = await db.collection('booking_config').doc('public').get();
    if (doc.exists) {
      const data = doc.data() || {};
      return NextResponse.json(data, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
    }
  } catch (e) {
    // fall through to defaults
  }

  const fallback = {
    regions: ['Auckland', 'Waikato', 'Bay of Plenty'],
    slots: {
      'Auckland': [{ weekday: 2, start: '17:30', end: '18:30' }],
      'Waikato': [{ weekday: 2, start: '17:30', end: '18:30' }],
      'Bay of Plenty': [{ weekday: 4, start: '11:00', end: '12:00' }],
    }
  };
  return NextResponse.json(fallback, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } });
}

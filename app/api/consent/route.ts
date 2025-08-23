import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bid, consent } = body || {};
    if (!consent || typeof consent !== 'object') {
      return NextResponse.json({ error: 'Missing consent' }, { status: 400 });
    }

    const db = getAdminDb();
    const payload = {
      consentAccepted: !!consent.accepted,
      consentName: String(consent.name || '').trim(),
      consentSignatureDataUrl: consent.signatureDataUrl || null,
      consentVersion: consent.consentVersion || null,
      consentAt: new Date().toISOString(),
    };

    if (bid) {
      const snap = await db.collection('bookings').where('bid', '==', bid).limit(1).get();
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await docRef.set(payload, { merge: true });
        return NextResponse.json({ ok: true, attachedTo: 'booking', bid });
      }
    }

    const ref = await db.collection('standalone_consents').add(payload);
    return NextResponse.json({ ok: true, attachedTo: 'standalone', id: ref.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

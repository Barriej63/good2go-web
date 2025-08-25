import { NextRequest, NextResponse } from 'next/server';

let db: FirebaseFirestore.Firestore | null = null;
try {
  const adminAny = require('@/lib/firebaseAdmin') || require('../../../../lib/firebaseAdmin');
  const admin = adminAny.default || adminAny;
  db = admin.firestore();
} catch (e) {
  console.warn('⚠️ Firestore Admin not loaded');
}

async function sendEmail(opts: {to: string; subject: string; html: string; text?: string}) {
  try {
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM || 'no-reply@good2go.local';
    if (!key) throw new Error('SENDGRID_API_KEY missing');
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: from },
        subject: opts.subject,
        content: [{ type: 'text/html', value: opts.html }]
      })
    });
  } catch (e:any) {
    console.warn('SendGrid send failed:', e?.message || e);
  }
}

function parseKV(s: string): Record<string,string> {
  const out: Record<string,string> = {};
  const usp = new URLSearchParams(s);
  for (const [k,v] of usp.entries()) out[k] = v;
  return out;
}

function pickRef(m: Record<string,string>): string | null {
  return m['Reference'] || m['reference'] || m['ref'] || m['merchantReference'] || null;
}
function pickTx(m: Record<string,string>): string | null {
  return m['TransactionId'] || m['transactionId'] || m['txn'] || null;
}

async function logReturn(map: Record<string,string>, method: string) {
  if (!db) return;
  const id = (pickTx(map) || 'noTx') + '-' + Date.now();
  await (db as any).collection('returns_log').doc(id).set({
    method, map, createdAt: new Date()
  });
}

/** Find booking doc even if nested like bookings/{tenant}/bookings/{ref} */
async function resolveBookingDocPathByRef(reference: string) {
  if (!db) return null;
  const q = await (db as any).collectionGroup('bookings').where('ref', '==', reference).limit(1).get();
  if (!q.empty) return q.docs[0].ref;
  // Fallback: top-level
  const top = (db as any).collection('bookings').doc(reference);
  const tSnap = await top.get();
  if (tSnap.exists) return top;
  return null;
}

function renderEmail(map: Record<string,string>, booking: any) {
  const ref = pickRef(map) || 'UNKNOWN';
  return `<div style="font-family:system-ui">
    <h2>Booking Confirmed</h2>
    <p>Thanks, your payment was processed.</p>
    <ul>
      <li><strong>Reference:</strong> ${ref}</li>
      <li><strong>Date:</strong> ${booking?.date || ''}</li>
      <li><strong>Time:</strong> ${booking?.slot?.start || ''} - ${booking?.slot?.end || ''}</li>
      <li><strong>Region:</strong> ${booking?.region || ''}</li>
      <li><strong>Venue:</strong> ${booking?.venueAddress || ''}</li>
      <li><strong>Amount:</strong> ${map['Amount']||''}</li>
      <li><strong>Status:</strong> ${map['Status']||''}</li>
    </ul>
  </div>`;
}

async function persist(map: Record<string,string>) {
  if (!db) return;
  const ref = pickRef(map) || 'UNKNOWN';
  const tx = pickTx(map) || 'UNKNOWN';
  const amount = map['Amount'] || '';
  const status = map['Status'] || '';
  const nowIso = new Date().toISOString();
  const cents = Math.round(parseFloat(amount || '0') * 100) || 0;

  const batch = (db as any).batch();
  // payments
  const payDoc = (db as any).collection('payments').doc(tx);
  batch.set(payDoc, { reference: ref, tx, amountCents: cents, createdAt: nowIso, raw: map }, { merge: true });

  // booking
  const bookingRef: any = await resolveBookingDocPathByRef(ref);
  if (bookingRef) {
    batch.set(bookingRef, { paid: true, paidAt: nowIso, status: 'paid', amountCents: cents, worldline: map }, { merge: true });
    const subPay = bookingRef.collection('payments').doc(tx);
    batch.set(subPay, { reference: ref, tx, amount, status, raw: map, createdAt: nowIso }, { merge: true });
  }

  await batch.commit();
}

async function handle(map: Record<string,string>, method: string, host: string, debug=false) {
  await logReturn(map, method);
  await persist(map);

  // send email
  let emailTo = process.env.BOOKING_NOTIFY_TO || '';
  const ref = pickRef(map);
  if (db && ref) {
    const docRef: any = await resolveBookingDocPathByRef(ref);
    if (docRef) {
      const snap = await docRef.get();
      const data = snap.data() || {};
      const custEmail = data.email || data.clientEmail || data.customerEmail || data.contactEmail;
      if (custEmail) emailTo = custEmail;
      if (emailTo) await sendEmail({
        to: emailTo,
        subject: 'Booking Confirmed',
        html: renderEmail(map, data)
      });
    }
  }

  if (debug) return NextResponse.json({ ok:true, method, ref, tx: pickTx(map), received: map });
  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://'+host);
  if (ref) successUrl.searchParams.set('ref', ref);
  return NextResponse.redirect(successUrl.toString(), { status:302 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const map = Object.fromEntries(url.searchParams.entries()) as Record<string,string>;
  const debug = url.searchParams.has('debug');
  return await handle(map, 'GET', req.nextUrl.host, debug);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const debug = url.searchParams.has('debug');
  const raw = await req.text();
  const map = parseKV(raw);
  return await handle(map, 'POST', req.nextUrl.host, debug);
}

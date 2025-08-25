import { NextRequest, NextResponse } from 'next/server';

let db: FirebaseFirestore.Firestore | null = null;
try {
  const adminAny = require('@/lib/firebaseAdmin') || require('../../../../lib/firebaseAdmin');
  const admin = adminAny.default || adminAny;
  db = admin.firestore();
} catch (e) {
  console.warn('⚠️ Firestore Admin not loaded. Skipping DB writes.');
}

async function sendEmail(opts: {to: string; subject: string; html: string; text?: string}) {
  try {
    const { sendMail } = await import('@/lib/email');
    return await sendMail(opts);
  } catch (e:any) {
    console.warn('Email helper missing or SMTP not set:', e?.message || e);
    return { ok:false, skipped:true };
  }
}

export const dynamic = 'force-dynamic';

function parseKV(s: string): Record<string,string> {
  const out: Record<string,string> = {};
  const usp = new URLSearchParams(s);
  for (const [k,v] of usp.entries()) out[k] = v;
  return out;
}
function extractFromRequest(req: NextRequest): Record<string,string> {
  const url = new URL(req.url);
  const m: Record<string,string> = {};
  url.searchParams.forEach((v,k)=> { m[k] = v; });
  return m;
}
function pickRef(m: Record<string,string>): string | null {
  return m['Reference'] || m['reference'] || m['ref'] || m['merchantReference'] || null;
}
function pick<T=string>(m: Record<string,string>, keys: string[], def: T & any = ''): any {
  for (const k of keys) if (m[k] != null) return m[k];
  return def;
}

function isoNow() {
  return new Date().toISOString();
}

function emailHtmlFromBooking(booking: any, ref: string, map: Record<string,string>) {
  const name = booking?.name || booking?.clientName || '';
  const date = booking?.date || '';
  const start = booking?.slot?.start || '';
  const end = booking?.slot?.end || '';
  const region = booking?.region || '';
  const venue = booking?.venueAddress || '';
  const amount = pick(map, ['Amount','amount'], '');
  return `
  <div style="font-family:system-ui">
    <h2>Booking Confirmed</h2>
    <p>Thanks${name ? ' ' + name : ''}! Your payment was successful.</p>
    <ul>
      <li><strong>Reference:</strong> ${ref}</li>
      ${date ? `<li><strong>Date:</strong> ${date}</li>` : ''}
      ${(start||end) ? `<li><strong>Time:</strong> ${start}${start&&end?'–':''}${end}</li>` : ''}
      ${region ? `<li><strong>Region:</strong> ${region}</li>` : ''}
      ${venue ? `<li><strong>Venue:</strong> ${venue}</li>` : ''}
      ${amount ? `<li><strong>Amount:</strong> ${amount}</li>` : ''}
      <li><strong>Status:</strong> ${pick(map,['Status','status'],'')}</li>
      <li><strong>TransactionId:</strong> ${pick(map,['TransactionId','transaction_id','txn'],'')}</li>
      <li><strong>ReceiptNumber:</strong> ${pick(map,['ReceiptNumber'],'')}</li>
      <li><strong>Card:</strong> ${pick(map,['CardType'],'')} ${pick(map,['CardNumber'],'')}</li>
    </ul>
  </div>`;
}

async function updateBookingFromPayment(reference: string, map: Record<string,string>) {
  if (!db) return { ok:false, skipped:true, reason:'no_db' };
  const refDoc = (db as any).collection('bookings').doc(reference);
  const snap = await refDoc.get();
  if (!snap.exists) {
    return { ok:false, skipped:true, reason:'booking_not_found' };
  }
  const amountStr = pick(map, ['Amount','amount'], '');
  const amountCents = amountStr ? Math.round(parseFloat(String(amountStr)) * 100) : undefined;

  const worldlinePayload = {
    env: process.env.WORLDLINE_ENV || '',
    returnedAt: isoNow(),
    TransactionId: pick(map,['TransactionId']),
    Type: pick(map,['Type']),
    Status: pick(map,['Status']),
    BatchNumber: pick(map,['BatchNumber']),
    ReceiptNumber: pick(map,['ReceiptNumber']),
    AuthCode: pick(map,['AuthCode']),
    Amount: amountStr,
    CardType: pick(map,['CardType']),
    CardNumber: pick(map,['CardNumber']),
    CardExpiry: pick(map,['CardExpiry']),
    CardHolder: pick(map,['CardHolder']),
    ErrorCode: pick(map,['ErrorCode']),
    ErrorMessage: pick(map,['ErrorMessage']),
    AcquirerResponseCode: pick(map,['AcquirerResponseCode']),
    Surcharge: pick(map,['Surcharge']),
  };

  const patch: any = {
    paid: true,
    paidAt: isoNow(),
    status: 'paid',
    worldline: worldlinePayload,
  };
  if (amountCents != null) patch.amountCents = amountCents;

  await refDoc.set(patch, { merge: true });
  return { ok:true };
}

async function persistPaymentDoc(reference: string, map: Record<string,string>) {
  if (!db) return { ok:false, skipped:true, reason:'no_db' };
  const txId = pick(map, ['TransactionId','transaction_id','txn'], '');
  if (!txId) return { ok:false, skipped:true, reason:'no_txid' };
  const payRef = (db as any).collection('payments').doc(txId);
  const existing = await payRef.get();
  if (existing.exists) return { ok:true, skipped:true };
  const doc = {
    reference,
    raw: map,
    createdAt: isoNow(),
  };
  await payRef.set(doc, { merge: true });
  return { ok:true };
}

async function handle(map: Record<string,string>, host: string) {
  const reference = pickRef(map) || 'UNKNOWN';

  // Firestore updates
  await updateBookingFromPayment(reference, map);
  await persistPaymentDoc(reference, map);

  // Email
  let to: string | null = null;
  if (db) {
    try {
      const snap = await (db as any).collection('bookings').doc(reference).get();
      if (snap.exists) {
        const b = snap.data() || {};
        to = b.email || b.clientEmail || b.customerEmail || b.contactEmail || null;
        if (to) {
          await sendEmail({
            to,
            subject: `Booking confirmed — ${reference}`,
            html: emailHtmlFromBooking(b, reference, map),
          });
        }
      }
    } catch {}
  }
  if (!to && process.env.BOOKING_NOTIFY_TO) {
    await sendEmail({
      to: process.env.BOOKING_NOTIFY_TO,
      subject: `Booking confirmed — ${reference}`,
      html: emailHtmlFromBooking({}, reference, map),
    });
  }

  // Redirect to success
  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://'+host);
  if (reference) successUrl.searchParams.set('ref', reference);
  return NextResponse.redirect(successUrl.toString(), { status: 302 });
}

export async function GET(req: NextRequest) {
  try {
    const map = extractFromRequest(req);
    return await handle(map, req.nextUrl.host);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error', step:'GET' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const map = parseKV(raw);
    return await handle(map, req.nextUrl.host);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'server_error', step:'POST' }, { status: 500 });
  }
}

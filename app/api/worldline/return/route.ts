import { NextRequest, NextResponse } from 'next/server';

let db: FirebaseFirestore.Firestore | null = null;
try {
  const adminAny = require('@/lib/firebaseAdmin') || require('../../../../lib/firebaseAdmin');
  const admin = adminAny.default || adminAny;
  db = admin.firestore();
} catch (e) {
  console.warn('⚠️ Firestore Admin not loaded. Skipping DB writes.');
}

// Built-in, dependency-free email stub to avoid build-time module resolution failures.
// If you already have an email system, replace this with your own call inside sendEmail().
async function sendEmail(_opts: {to: string; subject: string; html: string; text?: string}) {
  // No-op so builds never fail due to missing modules.
  return { ok:false, skipped:true, reason:'email_stub' };
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

async function getBookingEmail(reference: string): Promise<string | null> {
  if (!db) return null;
  try {
    const snap = await (db as any).collection('bookings').doc(reference).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return data.email || data.clientEmail || data.customerEmail || data.contactEmail || null;
  } catch (e:any) {
    console.warn('Lookup booking email failed:', e?.message || e);
    return null;
  }
}

function renderEmailHtml(map: Record<string,string>) {
  const ref = pickRef(map) || 'UNKNOWN';
  // For richer content, pull slot/venue/date if needed (we don't touch booking page here).
  return `
    <div style="font-family:system-ui">
      <h2>Booking Confirmed</h2>
      <p>Your payment was processed successfully.</p>
      <ul>
        <li><strong>Reference:</strong> ${ref}</li>
        <li><strong>Amount:</strong> ${map['Amount'] || ''}</li>
        <li><strong>Status:</strong> ${map['Status'] || ''}</li>
        <li><strong>TransactionId:</strong> ${map['TransactionId'] || ''}</li>
        <li><strong>Card:</strong> ${map['CardType'] || ''} ${map['CardNumber'] || ''}</li>
      </ul>
      <p>Thanks for booking with Good2Go.</p>
    </div>
  `;
}

async function persistPayment(map: Record<string,string>) {
  if (!db) return { ok:false, skipped:true, reason:'no_db' };
  const ref = pickRef(map) || 'UNKNOWN';
  const txId = map['TransactionId'] || map['transaction_id'] || map['txn'] || 'UNKNOWN';
  const amount = map['Amount'] || map['amount'] || '';
  const status = map['Status'] || map['status'] || '';
  const createdAt = new Date();

  const doc = {
    reference: ref,
    transactionId: txId,
    amount,
    status,
    raw: map,
    createdAt,
  };

  try {
    const payDocRef = (db as any).collection('payments').doc(txId);
    const existing = await payDocRef.get();
    if (existing.exists) {
      return { ok:true, txId, ref, skipped:true };
    }
    const batch = (db as any).batch();
    batch.set(payDocRef, doc, { merge: true });
    const bookPayRef = (db as any).collection('bookings').doc(ref).collection('payments').doc(txId);
    batch.set(bookPayRef, doc, { merge: true });
    await batch.commit();
    return { ok:true, txId, ref };
  } catch (e:any) {
    console.error('Persist payment failed:', e?.message || e);
    return { ok:false, error:e?.message || String(e) };
  }
}

async function handle(map: Record<string,string>, host: string) {
  await persistPayment(map);

  const ref = pickRef(map);
  const customerEmail = ref ? await getBookingEmail(ref) : null;
  if (customerEmail) {
    await sendEmail({
      to: customerEmail,
      subject: 'Booking Confirmed',
      html: renderEmailHtml(map),
    });
  } else if (process.env.BOOKING_NOTIFY_TO) {
    await sendEmail({
      to: process.env.BOOKING_NOTIFY_TO,
      subject: 'Booking Confirmed',
      html: renderEmailHtml(map),
    });
  }

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://'+host);
  if (ref) successUrl.searchParams.set('ref', ref);
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

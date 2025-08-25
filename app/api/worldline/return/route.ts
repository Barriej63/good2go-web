import { NextRequest, NextResponse } from 'next/server';

// ---- Firestore Admin (expected at lib/firebaseAdmin) ----
let db: FirebaseFirestore.Firestore | null = null;
try {
  const adminAny = require('@/lib/firebaseAdmin') || require('../../../../lib/firebaseAdmin');
  const admin = adminAny.default || adminAny;
  db = admin.firestore();
} catch (e) {
  console.warn('⚠️ Firestore Admin not loaded. Skipping DB writes.');
}

export const dynamic = 'force-dynamic';

// ---- Utilities ----
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
function isoNow(): string {
  return new Date().toISOString();
}

// ---- Booking lookup ----
async function getBookingByRef(reference: string): Promise<any | null> {
  if (!db) return null;
  try {
    const snap = await (db as any).collection('bookings').doc(reference).get();
    if (!snap.exists) return null;
    return snap.data() || null;
  } catch (e:any) {
    console.warn('Lookup booking failed:', e?.message || e);
    return null;
  }
}

// ---- Firestore writes (idempotent) ----
async function persistPayment(map: Record<string,string>) {
  if (!db) return { ok:false, skipped:true, reason:'no_db' };
  const ref = pickRef(map) || 'UNKNOWN';
  const txId = map['TransactionId'] || map['transaction_id'] || map['txn'] || 'UNKNOWN';
  const amount = map['Amount'] || map['amount'] || '';
  const status = map['Status'] || map['status'] || '';
  const receipt = map['ReceiptNumber'] || map['receipt'] || '';

  const doc = {
    reference: ref,
    transactionId: txId,
    amount,
    status,
    receipt,
    raw: map,
    createdAt: new Date(),
  };

  try {
    const payDocRef = (db as any).collection('payments').doc(txId);
    const existing = await payDocRef.get();
    const batch = (db as any).batch();
    if (!existing.exists) {
      batch.set(payDocRef, doc, { merge: true });
    }

    const bookRef = (db as any).collection('bookings').doc(ref);
    batch.set(bookRef, {
      paid: true,
      paidAt: isoNow(),
      status: 'paid',
      amountCents: amount ? Math.round(parseFloat(String(amount)) * 100) : undefined,
      worldline: {
        env: process.env.WORLDLINE_ENV || 'uat',
        returnedAt: isoNow(),
        TransactionId: txId,
        ReceiptNumber: receipt,
        Status: status,
        Amount: amount,
        CardType: map['CardType'] || '',
        CardNumber: map['CardNumber'] || '',
        AuthCode: map['AuthCode'] || '',
        AcquirerResponseCode: map['AcquirerResponseCode'] || '',
      }
    }, { merge: true });

    const nested = (db as any).collection('bookings').doc(ref).collection('payments').doc(txId);
    if (!existing.exists) {
      batch.set(nested, doc, { merge: true });
    }

    await batch.commit();
    return { ok:true, ref, txId };
  } catch (e:any) {
    console.error('Persist payment failed:', e?.message || e);
    return { ok:false, error:e?.message || String(e) };
  }
}

// ---- Email via SendGrid v3 (no external deps) ----
async function sendViaSendGrid(to: string, subject: string, html: string, text?: string) {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const from = process.env.SENDGRID_FROM || '';
  if (!apiKey || !from || !to) {
    return { ok:false, skipped:true, reason:'missing_env_or_to' };
  }
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from.replace(/.*<([^>]+)>.*/, '$1'), name: from.includes('<') ? from.split('<')[0].trim() : from },
    subject,
    content: [
      { type: 'text/plain', value: text || '' },
      { type: 'text/html', value: html }
    ]
  };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text().catch(()=>'');
    console.warn('SendGrid error', res.status, err.slice(0,300));
    return { ok:false, status: res.status, err: err.slice(0,300) };
  }
  return { ok:true };
}

function buildEmailHTML(booking: any, map: Record<string,string>) {
  const ref = pickRef(map) || 'UNKNOWN';
  const date = booking?.date || '';
  const start = booking?.slot?.start || '';
  const end = booking?.slot?.end || '';
  const region = booking?.region || '';
  const venue = booking?.venueAddress || booking?.venue || '';
  const amount = map['Amount'] || '';
  const status = map['Status'] || '';
  const txId = map['TransactionId'] || '';
  const receipt = map['ReceiptNumber'] || '';
  const card = `${map['CardType'] || ''} ${map['CardNumber'] || ''}`.trim();

  return `
  <div style="font-family:system-ui">
    <h2 style="margin:0 0 8px">Booking confirmed</h2>
    <p style="margin:0 0 12px">Thanks! Your payment was successful.</p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Reference</b></td><td>${ref}</td></tr>
      <tr><td><b>Date</b></td><td>${date}</td></tr>
      <tr><td><b>Time</b></td><td>${start}${end ? '–'+end : ''}</td></tr>
      <tr><td><b>Region</b></td><td>${region}</td></tr>
      <tr><td><b>Venue</b></td><td>${venue}</td></tr>
      <tr><td><b>Amount</b></td><td>${amount}</td></tr>
      <tr><td><b>Status</b></td><td>${status}</td></tr>
      <tr><td><b>Transaction</b></td><td>${txId}</td></tr>
      <tr><td><b>Receipt</b></td><td>${receipt}</td></tr>
      <tr><td><b>Card</b></td><td>${card}</td></tr>
    </table>
    <p style="margin-top:16px">We look forward to seeing you.</p>
  </div>`;
}

function buildEmailText(booking: any, map: Record<string,string>) {
  const ref = pickRef(map) || 'UNKNOWN';
  const date = booking?.date || '';
  const start = booking?.slot?.start || '';
  const end = booking?.slot?.end || '';
  const region = booking?.region || '';
  const venue = booking?.venueAddress || booking?.venue || '';
  return `Booking confirmed\nReference: ${ref}\nDate: ${date}\nTime: ${start}${end ? '-'+end : ''}\nRegion: ${region}\nVenue: ${venue}`;
}

async function handle(map: Record<string,string>, host: string) {
  // Persist
  await persistPayment(map);

  // Email
  const ref = pickRef(map);
  const booking = ref ? await getBookingByRef(ref) : null;
  const to =
    (booking?.email || booking?.clientEmail || booking?.customerEmail || booking?.contactEmail ||
      process.env.BOOKING_NOTIFY_TO || '');
  if (to) {
    await sendViaSendGrid(
      to,
      `Booking confirmed — ${ref}`,
      buildEmailHTML(booking, map),
      buildEmailText(booking, map)
    );
  }

  // Redirect
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

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';

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
function toCents(amount: string|undefined): number | null {
  if (!amount) return null;
  const n = Number(amount.replace(/[^0-9.]/g,''));
  if (!isFinite(n)) return null;
  return Math.round(n*100);
}

async function sendViaSendGrid(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const from = process.env.SENDGRID_FROM || '';
  if (!apiKey || !from) return { ok:false, skipped:true, reason:'missing_sendgrid_env' };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.match(/<(.+)>/)?.[1] || from, name: from.replace(/<.*>/,'').trim() },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status };
}

function renderEmailHtml(map: Record<string,string>, booking: any) {
  const ref = pickRef(map) || 'UNKNOWN';
  const date = booking?.date || '';
  const start = booking?.slot?.start || '';
  const end = booking?.slot?.end || '';
  const region = booking?.region || '';
  const venue = booking?.venueAddress || '';
  return `
  <div style="font-family:system-ui">
    <h2>Booking Confirmed</h2>
    <p>Thanks! Your payment was successful.</p>
    <ul>
      <li><strong>Reference:</strong> ${ref}</li>
      <li><strong>Date:</strong> ${date}</li>
      <li><strong>Time:</strong> ${start}${end ? '–'+end : ''}</li>
      <li><strong>Region:</strong> ${region}</li>
      <li><strong>Venue:</strong> ${venue}</li>
      <li><strong>Amount:</strong> ${map['Amount'] || ''}</li>
      <li><strong>TransactionId:</strong> ${map['TransactionId'] || ''}</li>
      <li><strong>Receipt:</strong> ${map['ReceiptNumber'] || ''}</li>
      <li><strong>Card:</strong> ${map['CardType'] || ''} ${map['CardNumber'] || ''}</li>
    </ul>
  </div>`;
}

async function loadBooking(db: FirebaseFirestore.Firestore, reference: string) {
  const snap = await (db as any).collection('bookings').doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function persist(db: FirebaseFirestore.Firestore, map: Record<string,string>, booking: any) {
  const ref = pickRef(map) || 'UNKNOWN';
  const txId = map['TransactionId'] || 'UNKNOWN';
  const nowIso = new Date().toISOString();
  const amountCents = toCents(map['Amount'] || '');

  const worldline = {
    env: process.env.WORLDLINE_ENV || '',
    returnedAt: nowIso,
    ...map
  };

  // Update booking
  const bookingPatch: any = {
    status: 'paid',
    paid: true,
    paidAt: nowIso,
    worldline,
  };
  if (amountCents != null) bookingPatch.amountCents = amountCents;

  const batch = (db as any).batch();
  const bookingRef = (db as any).collection('bookings').doc(ref);
  batch.set(bookingRef, bookingPatch, { merge: true });

  // payments/<txId>
  const payDoc = (db as any).collection('payments').doc(txId);
  batch.set(payDoc, {
    reference: ref,
    createdAt: nowIso,
    amountCents,
    raw: map,
    status: map['Status'] || '',
  }, { merge: true });

  // bookings/<ref>/payments/<txId>
  const nested = bookingRef.collection('payments').doc(txId);
  batch.set(nested, {
    reference: ref,
    createdAt: nowIso,
    amountCents,
    raw: map,
    status: map['Status'] || '',
  }, { merge: true });

  await batch.commit();
}

async function handle(req: NextRequest, map: Record<string,string>) {
  const ref = pickRef(map);
  const host = req.nextUrl.host;
  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://'+host);
  if (ref) successUrl.searchParams.set('ref', ref);

  const dbGet = await getFirestoreSafe();
  if (!dbGet.ok || !dbGet.db) {
    console.error('Firestore unavailable:', dbGet);
    if (req.nextUrl.searchParams.get('debug') === '1') {
      return NextResponse.json({ ok:false, step:'firestore_init', detail: dbGet }, { status: 500 });
    }
    return NextResponse.redirect(successUrl.toString(), { status: 302 });
  }
  const db = dbGet.db;

  try {
    const booking = ref ? await loadBooking(db, ref) : null;
    await persist(db, map, booking);

    // Email
    let to =
      (booking && (booking.email || booking.clientEmail || booking.customerEmail || booking.contactEmail)) ||
      process.env.BOOKING_NOTIFY_TO || '';

    if (to) {
      const html = renderEmailHtml(map, booking);
      const sent = await sendViaSendGrid(to, `Booking confirmed — ${ref}`, html);
      if (!sent.ok) console.warn('SendGrid failed', sent);
    }

    if (req.nextUrl.searchParams.get('debug') === '1') {
      return NextResponse.json({ ok:true, ref, persisted:true, emailed: !!to });
    }
    return NextResponse.redirect(successUrl.toString(), { status: 302 });
  } catch (e:any) {
    console.error('Return handle error:', e?.message || e);
    if (req.nextUrl.searchParams.get('debug') === '1') {
      return NextResponse.json({ ok:false, error:e?.message||String(e) }, { status: 500 });
    }
    return NextResponse.redirect(successUrl.toString(), { status: 302 });
  }
}

export async function GET(req: NextRequest) {
  const map = extractFromRequest(req);
  return handle(req, map);
}
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const map = parseKV(raw);
  return handle(req, map);
}

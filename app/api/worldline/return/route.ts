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
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: from },
        subject: opts.subject,
        content: [{ type: 'text/html', value: opts.html }]
      })
    });
    return { ok: res.status === 202, status: res.status };
  } catch (e:any) {
    console.warn('SendGrid send failed:', e?.message || e);
    return { ok:false, error:e?.message || String(e) };
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
  try {
    await (db as any).collection('returns_log').doc(id).set({
      method, map, createdAt: new Date()
    });
  } catch (e:any) {
    console.warn('logReturn failed:', e?.message || e);
  }
}

async function persist(map: Record<string,string>) {
  if (!db) return;
  const ref = pickRef(map) || 'UNKNOWN';
  const tx = pickTx(map) || 'UNKNOWN';
  const amount = map['Amount'] || '';
  const status = map['Status'] || '';
  const now = new Date().toISOString();
  try {
    const batch = (db as any).batch();
    const payDoc = (db as any).collection('payments').doc(tx);
    batch.set(payDoc, { reference: ref, tx, amount, status, raw: map, returnedAt: now }, { merge: true });
    const bookRef = (db as any).collection('bookings').doc(ref);
    batch.set(bookRef, { paid:true, paidAt: now, status:'paid', amountCents: Math.round(parseFloat(amount||'0')*100), worldline: map }, { merge: true });
    const bookPay = bookRef.collection('payments').doc(tx);
    batch.set(bookPay, { reference: ref, tx, amount, status, raw: map, returnedAt: now }, { merge: true });
    await batch.commit();
  } catch (e:any) {
    console.error('persist failed:', e?.message || e);
  }
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

async function handle(map: Record<string,string>, method: string, host: string, debug=false) {
  await logReturn(map, method);
  await persist(map);

  // find booking email
  let emailTo = process.env.BOOKING_NOTIFY_TO || '';
  const ref = pickRef(map);
  if (db && ref) {
    try {
      const snap = await (db as any).collection('bookings').doc(ref).get();
      if (snap.exists) {
        const data = snap.data();
        const custEmail = data.email || data.clientEmail || data.customerEmail || data.contactEmail;
        if (custEmail) emailTo = custEmail;
        if (emailTo) await sendEmail({
          to: emailTo,
          subject: 'Booking Confirmed',
          html: renderEmail(map, data)
        });
      }
    } catch (e:any) { console.warn('lookup email failed', e?.message||e); }
  }

  if (debug) return NextResponse.json({ ok:true, method, ref, tx: pickTx(map), received: map }, { status:200 });

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://'+host);
  if (ref) successUrl.searchParams.set('ref', ref);
  return NextResponse.redirect(successUrl.toString(), { status:302 });
}

export async function GET(req: NextRequest) {
  try {
    const map = Object.fromEntries(new URL(req.url).searchParams.entries());
    const debug = new URL(req.url).searchParams.has('debug');
    return await handle(map, 'GET', req.nextUrl.host, debug);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'server_error', step:'GET' }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const map = parseKV(raw);
    const debug = (new URL(req.url)).searchParams.has('debug');
    return await handle(map, 'POST', req.nextUrl.host, debug);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message||'server_error', step:'POST' }, { status:500 });
  }
}

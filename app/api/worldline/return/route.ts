// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

const db = getFirestoreFromAny();

function kv(input: URLSearchParams | string): Record<string,string> {
  const params = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out: Record<string,string> = {};
  for (const [k,v] of params.entries()) out[k] = v;
  return out;
}

const pickRef = (m:Record<string,string>) =>
  m.Reference || m.reference || m.ref || m.merchantReference || null;
const pickTx  = (m:Record<string,string>) =>
  m.TransactionId || m.transactionId || m.txn || null;

function centsFromAmount(a: string | undefined) {
  const n = a ? parseFloat(a) : 0;
  return Math.round((isNaN(n) ? 0 : n) * 100);
}

function errInfo(e:any) {
  return {
    message: e?.message || String(e),
    code: e?.code || null,
    name: e?.name || null,
    stack: (e?.stack || '').split('\n').slice(0,3).join('\n'),
  };
}

async function safeLog(col: string, payload: any) {
  try {
    if (!db) return;
    const id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    await (db as any).collection(col).doc(id).set({ ...payload, at: new Date().toISOString() });
  } catch {}
}

async function writePayment(map: Record<string,string>) {
  if (!db) throw new Error('no_db');
  const tx = pickTx(map) || 'UNKNOWN';
  const ref = pickRef(map);
  const cents = centsFromAmount(map['Amount']);
  const nowIso = new Date().toISOString();
  await (db as any).collection('payments').doc(tx).set({
    reference: ref, tx, amountCents: cents, createdAt: nowIso, raw: map,
    status: map['Status'] || null,
  }, { merge: true });
  return { tx, cents };
}

// Try multiple strategies to resolve the booking doc
async function resolveBookingDoc(map: Record<string,string>) {
  if (!db) throw new Error('no_db');
  const ref = pickRef(map);
  if (!ref) return { found:false, path:null };

  // 1) Direct doc id
  const direct = await (db as any).collection('bookings').doc(ref).get();
  if (direct.exists) return { found:true, path: direct.ref.path, ref: direct.ref };

  // 2) Field 'ref'
  const q1 = await (db as any).collection('bookings').where('ref','==', ref).limit(1).get();
  if (!q1.empty) return { found:true, path:q1.docs[0].ref.path, ref:q1.docs[0].ref };

  // 3) Field 'reference' (alt naming)
  const q2 = await (db as any).collection('bookings').where('reference','==', ref).limit(1).get();
  if (!q2.empty) return { found:true, path:q2.docs[0].ref.path, ref:q2.docs[0].ref };

  return { found:false, path:null };
}

async function updateBooking(map: Record<string,string>) {
  if (!db) throw new Error('no_db');
  const res = await resolveBookingDoc(map);
  if (!res.found || !res.ref) return { found:false, path:null };

  const bRef = res.ref;
  const nowIso = new Date().toISOString();
  const cents = centsFromAmount(map['Amount']);
  const tx = pickTx(map) || 'UNKNOWN';

  await bRef.set({
    paid: true, paidAt: nowIso, status: 'paid', amountCents: cents, worldline: map
  }, { merge: true });

  await bRef.collection('payments').doc(tx).set({
    reference: pickRef(map), tx, amount: map['Amount'] || null,
    status: map['Status'] || null, raw: map, createdAt: nowIso
  }, { merge: true });

  return { found:true, path: bRef.path, tx };
}

async function maybeEmail(map: Record<string,string>) {
  try {
    if (process.env.RETURN_NO_EMAIL === '1') return;
    if (!db) return;
    const refStr = pickRef(map);
    if (!refStr) return;
    const res = await resolveBookingDoc(map);
    if (!res.found || !res.ref) return;
    const snap = await res.ref.get();
    const data = snap.exists ? snap.data() : null;
    const email =
      data?.email || data?.clientEmail || data?.customerEmail ||
      data?.contactEmail || process.env.BOOKING_NOTIFY_TO;
    if (!email) return;

    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM || 'no-reply@good2go.local';
    if (!key) return;

    const html = `<div style="font-family:system-ui">
      <h2>Booking Confirmed</h2>
      <p>Thanks, your payment was processed.</p>
      <ul>
        <li><strong>Reference:</strong> ${refStr}</li>
        <li><strong>Date:</strong> ${data?.date || ''}</li>
        <li><strong>Time:</strong> ${data?.slot?.start || ''} - ${data?.slot?.end || ''}</li>
        <li><strong>Region:</strong> ${data?.region || ''}</li>
        <li><strong>Venue:</strong> ${data?.venueAddress || ''}</li>
        <li><strong>Amount:</strong> ${map['Amount']||''}</li>
        <li><strong>Status:</strong> ${map['Status']||''}</li>
      </ul>
    </div>`;

    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${key}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: from },
        subject: 'Booking Confirmed',
        content: [{ type: 'text/html', value: html }]
      })
    });
  } catch {}
}

async function handle(map: Record<string,string>, method: string, host: string, debug: boolean) {
  const report: any = { ok:true, method, ref: pickRef(map), tx: pickTx(map), steps:{} };

  try {
    report.steps.payment = await writePayment(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.paymentError = errInfo(e);
    await safeLog('returns_error', { step: 'payment', map, error: report.steps.paymentError });
  }

  try {
    report.steps.booking = await updateBooking(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.bookingError = errInfo(e);
    await safeLog('returns_error', { step: 'booking', map, error: report.steps.bookingError });
  }

  if (!report.steps?.booking?.found) {
    await safeLog('returns_orphans', { map, ref: pickRef(map) });
  } else {
    // Email only if we actually resolved a booking
    await maybeEmail(map);
  }

  if (debug) return NextResponse.json(report);

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://' + host);
  if (report.ref) successUrl.searchParams.set('ref', report.ref);
  return NextResponse.redirect(successUrl.toString(), { status: 302 });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const map = kv(url.searchParams);
    const debug = url.searchParams.has('debug');
    return await handle(map, 'GET', req.nextUrl.host, debug);
  } catch (e:any) {
    await safeLog('returns_error', { when:'GET', error: errInfo(e) });
    return NextResponse.json({ ok:false, error:'server_error', detail: errInfo(e) }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.has('debug');
    const raw = await req.text();
    const map = kv(raw);
    return await handle(map, 'POST', req.nextUrl.host, debug);
  } catch (e:any) {
    await safeLog('returns_error', { when:'POST', error: errInfo(e) });
    return NextResponse.json({ ok:false, error:'server_error', detail: errInfo(e) }, { status: 200 });
  }
}

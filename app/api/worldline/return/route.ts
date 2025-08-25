// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

const db = getFirestoreFromAny();

function normalizeKV(input: URLSearchParams | string): Record<string,string> {
  const params = typeof input === 'string' ? new URLSearchParams(input) : input;
  const out: Record<string,string> = {};
  for (const [k,v] of params.entries()) out[k] = v;
  return out;
}

const pickRef = (m:Record<string,string>) => m.Reference || m.reference || m.ref || m.merchantReference || null;
const pickTx  = (m:Record<string,string>) => m.TransactionId || m.transactionId || m.txn || null;

async function safeLog(kind: 'returns_log'|'returns_error', payload: any) {
  try {
    if (!db) return;
    const id = (Date.now()) + '-' + Math.random().toString(36).slice(2,8);
    await (db as any).collection(kind).doc(id).set({ ...payload, at: new Date().toISOString() });
  } catch {}
}

async function safeSendEmail(to: string, subject: string, html: string) {
  try {
    if (process.env.RETURN_NO_EMAIL === '1') return;
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM || 'no-reply@good2go.local';
    if (!key || !to) return;
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });
  } catch {}
}

async function persist(map: Record<string,string>) {
  if (!db) return { ok:false, reason: 'no_db' };
  const ref = pickRef(map);
  const tx = pickTx(map) || 'UNKNOWN';
  const amount = map['Amount'] || '';
  const nowIso = new Date().toISOString();
  const cents = Math.round(parseFloat(amount || '0') * 100) || 0;

  const batch = (db as any).batch();
  const payDoc = (db as any).collection('payments').doc(tx);
  batch.set(payDoc, { reference: ref, tx, amountCents: cents, createdAt: nowIso, raw: map }, { merge: true });

  let bookingPath: string | null = null;
  if (ref) {
    const snap = await (db as any).collectionGroup('bookings').where('ref','==', ref).limit(1).get();
    if (!snap.empty) {
      const bRef = snap.docs[0].ref;
      bookingPath = bRef.path;
      batch.set(bRef, { paid: true, paidAt: nowIso, status: 'paid', amountCents: cents, worldline: map }, { merge: true });
      batch.set(bRef.collection('payments').doc(tx), { reference: ref, tx, amount, status: map['Status'] || '', raw: map, createdAt: nowIso }, { merge: true });
    }
  }

  await batch.commit();
  return { ok:true, bookingPath };
}

function renderEmail(map: Record<string,string>, booking: any) {
  const ref = pickRef(map) || '';
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

async function maybeEmail(map: Record<string,string>) {
  try {
    if (!db) return;
    const ref = pickRef(map);
    if (!ref) return;
    const snap = await (db as any).collectionGroup('bookings').where('ref','==', ref).limit(1).get();
    if (snap.empty) return;
    const doc = snap.docs[0];
    const data = doc.data() || {};
    const email = data.email || data.clientEmail || data.customerEmail || data.contactEmail || process.env.BOOKING_NOTIFY_TO;
    if (!email) return;
    await safeSendEmail(email, 'Booking Confirmed', renderEmail(map, data));
  } catch {}
}

async function handleReturn(map: Record<string,string>, method: string, host: string, debug=false) {
  await safeLog('returns_log', { method, map });

  const persistRes = await persist(map);
  await maybeEmail(map);

  const ref = pickRef(map);
  const tx = pickTx(map);

  if (debug) {
    return NextResponse.json({ ok:true, method, ref, tx, persist: persistRes, received: map });
  }

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://' + host);
  if (ref) successUrl.searchParams.set('ref', ref);
  return NextResponse.redirect(successUrl.toString(), { status: 302 });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const map = normalizeKV(url.searchParams);
    const debug = url.searchParams.has('debug');
    return await handleReturn(map, 'GET', req.nextUrl.host, debug);
  } catch (e:any) {
    await safeLog('returns_error', { when:'GET', error: e?.message || String(e) });
    return NextResponse.json({ ok:false, error:'server_error', detail: e?.message || String(e) }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const debug = url.searchParams.has('debug');
    const raw = await req.text();
    const map = normalizeKV(raw);
    return await handleReturn(map, 'POST', req.nextUrl.host, debug);
  } catch (e:any) {
    await safeLog('returns_error', { when:'POST', error: e?.message || String(e) });
    return NextResponse.json({ ok:false, error:'server_error', detail: e?.message || String(e) }, { status: 200 });
  }
}

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
const pickRef = (m:Record<string,string>) => m.Reference || m.reference || m.ref || m.merchantReference || null;
const pickTx  = (m:Record<string,string>) => m.TransactionId || m.transactionId || m.txn || null;

async function logDoc(kind: 'returns_log'|'returns_error', payload: any) {
  try {
    if (!db) return;
    const id = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    await (db as any).collection(kind).doc(id).set({ ...payload, at: new Date().toISOString() });
  } catch {}
}

function errInfo(e:any) {
  return {
    message: e?.message || String(e),
    code: e?.code || null,
    name: e?.name || null,
    stack: (e?.stack || '').split('\n').slice(0,3).join('\n'),
  };
}

async function writePayment(map: Record<string,string>) {
  if (!db) throw new Error('no_db');
  const tx = pickTx(map) || 'UNKNOWN';
  const ref = pickRef(map);
  const amount = map['Amount'] || '0';
  const cents = Math.round(parseFloat(amount) * 100) || 0;
  const nowIso = new Date().toISOString();
  const doc = (db as any).collection('payments').doc(tx);
  await doc.set({ reference: ref, tx, amountCents: cents, createdAt: nowIso, raw: map }, { merge: true });
  return { tx, cents };
}

async function updateBooking(map: Record<string,string>) {
  if (!db) throw new Error('no_db');
  const ref = pickRef(map);
  if (!ref) return { found: false, path: null };
  const q = await (db as any).collectionGroup('bookings').where('ref','==', ref).limit(1).get();
  if (q.empty) return { found: false, path: null };
  const bRef = q.docs[0].ref;
  const nowIso = new Date().toISOString();
  const amount = map['Amount'] || '0';
  const cents = Math.round(parseFloat(amount) * 100) || 0;
  await bRef.set({ paid: true, paidAt: nowIso, status: 'paid', amountCents: cents, worldline: map }, { merge: true });
  const tx = pickTx(map) || 'UNKNOWN';
  await bRef.collection('payments').doc(tx).set({
    reference: ref, tx, amount, status: map['Status'] || '', raw: map, createdAt: nowIso
  }, { merge: true });
  return { found: true, path: bRef.path, tx };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const map = kv(url.searchParams);
  const debug = url.searchParams.has('debug');
  const ref = pickRef(map);
  const tx = pickTx(map);

  const report: any = { ok: true, method: 'GET', ref, tx, steps: {} };

  try {
    report.steps.payment = await writePayment(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.paymentError = errInfo(e);
    await logDoc('returns_error', { step: 'payment', map, error: report.steps.paymentError });
  }

  try {
    report.steps.booking = await updateBooking(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.bookingError = errInfo(e);
    await logDoc('returns_error', { step: 'booking', map, error: report.steps.bookingError });
  }

  if (debug) {
    return NextResponse.json(report);
  }

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://' + req.nextUrl.host);
  if (ref) successUrl.searchParams.set('ref', ref);
  return NextResponse.redirect(successUrl.toString(), { status: 302 });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = await req.text();
  const map = kv(body);
  const debug = url.searchParams.has('debug');
  const ref = pickRef(map);
  const tx = pickTx(map);

  const report: any = { ok: true, method: 'POST', ref, tx, steps: {} };

  try {
    report.steps.payment = await writePayment(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.paymentError = errInfo(e);
    await logDoc('returns_error', { step: 'payment', map, error: report.steps.paymentError });
  }

  try {
    report.steps.booking = await updateBooking(map);
  } catch (e:any) {
    report.ok = false;
    report.steps.bookingError = errInfo(e);
    await logDoc('returns_error', { step: 'booking', map, error: report.steps.bookingError });
  }

  if (debug) {
    return NextResponse.json(report);
  }

  const successUrl = new URL('/success', process.env.SITE_BASE_URL || 'https://' + req.nextUrl.host);
  if (ref) successUrl.searchParams.set('ref', ref);
  return NextResponse.redirect(successUrl.toString(), { status: 302 });
}

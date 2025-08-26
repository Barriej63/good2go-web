// app/api/worldline/return/route.ts
// Return webhook/redirect handler with GET + POST support (form + JSON)
// - Fixes SendGrid header escaping
// - Auto-updates bookings when Merchant Reference is the bookingId
// - Writes top-level payments/<TransactionId>
// - Debug JSON when ?debug=1, otherwise 302 redirect to /success?ref=<ref>

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

type ReturnMap = Record<string, string | null>;

// helpers ---------------------------
function toStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  return String(v);
}

async function parseBody(req: NextRequest): Promise<ReturnMap> {
  const ct = req.headers.get('content-type') || '';
  const out: ReturnMap = {};
  try {
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      for (const [k, v] of fd.entries()) out[k] = toStr(v);
      return out;
    }
    if (ct.includes('application/json')) {
      const j = await req.json();
      for (const k of Object.keys(j || {})) out[k] = toStr(j[k]);
      return out;
    }
  } catch { /* fallthrough to query */ }
  // fallback: treat as empty; caller will merge with query params
  return out;
}

function centsFromAmount(amount: string | null): number | null {
  if (!amount) return null;
  const n = Number(amount);
  if (!isFinite(n)) return null;
  return Math.round(n * 100);
}

async function sendConfirmation(email: string, subject: string, textBody: string) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!key || !from) return { ok:false, error:'missing_sendgrid_env' };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: { email: from },
      personalizations: [{ to: [{ email }] }],
      subject,
      content: [{ type: 'text/plain', value: textBody }],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(()=>'') as string;
    return { ok:false, status:res.status, detail:t };
  }
  return { ok:true };
}

async function persistPayment(db: FirebaseFirestore.Firestore, map: ReturnMap) {
  const tx = map['TransactionId'] || map['tx'] || null;
  if (!tx) return null;
  const ref = db.collection('payments').doc(tx);
  const payload: any = {
    reference: map['Reference'] || map['ref'] || null,
    status: map['Status'] || null,
    amount: map['Amount'] || null,
    createdAt: new Date().toISOString(),
    raw: map,
  };
  await ref.set(payload, { merge: true });
  return ref.path;
}

async function updateBookingIfPossible(db: FirebaseFirestore.Firestore, map: ReturnMap) {
  const refOrId = map['Reference'] || map['ref'] || null;
  if (!refOrId) return { updated:false };
  const bookingId = refOrId; // we set MerchantReference=bookingId in create shim
  const bRef = db.collection('bookings').doc(bookingId);
  const snap = await bRef.get();
  if (!snap.exists) return { updated:false };

  const updates: any = {
    ref: refOrId,
    status: 'paid',
    paid: true,
    paidAt: new Date().toISOString(),
  };
  const cents = centsFromAmount(map['Amount'] || null);
  if (cents != null) updates.amountCents = cents;

  const tx = map['TransactionId'] || null;
  await bRef.set(updates, { merge: true });
  if (tx) {
    await bRef.collection('payments').doc(tx).set({
      reference: refOrId,
      tx,
      amount: map['Amount'] || null,
      status: map['Status'] || null,
      createdAt: new Date().toISOString(),
      raw: map,
    }, { merge: true });
  }
  return { updated:true, bookingPath: bRef.path };
}

// handler --------------------------
async function handle(map: ReturnMap, req: NextRequest) {
  const db = getFirestoreFromAny();
  if (!db) return NextResponse.json({ ok:false, error:'no_db' }, { status: 200 });

  // write payment doc
  const paymentPath = await persistPayment(db as any, map).catch(e => null);

  // update booking (when Reference == booking doc id)
  const bookingResult = await updateBookingIfPossible(db as any, map).catch(() => ({ updated:false }));

  // optional email confirmation
  const email = map['Email'] || map['email'] || null;
  if (email) {
    await sendConfirmation(email, 'Booking Confirmation', `Your booking ${map['Reference'] || ''} is confirmed.`);
  }

  const debug = req.nextUrl.searchParams.get('debug');
  if (debug === '1') {
    return NextResponse.json({
      ok: true,
      method: req.method,
      map,
      paymentPath,
      bookingResult,
    }, { status: 200 });
  }

  const ref = map['Reference'] || '';
  const successPath = process.env.SUCCESS_PAGE_PATH || '/success';
  const dest = `${successPath}?ref=${encodeURIComponent(ref)}`;
  return NextResponse.redirect(dest, { status: 302 });
}

export async function GET(req: NextRequest) {
  const map: ReturnMap = {};
  const url = new URL(req.url);
  url.searchParams.forEach((v, k) => { map[k] = v; });
  return handle(map, req);
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const url = new URL(req.url);
  url.searchParams.forEach((v, k) => { if (body[k] == null) body[k] = v; });
  return handle(body, req);
}

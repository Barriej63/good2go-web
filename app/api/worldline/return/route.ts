// app/api/worldline/return/route.ts
// Worldline return handler: updates booking/payment, sends confirmation email (via SendGrid),
// and redirects to /success. Hardened for Node runtime & absolute redirects.

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReturnMap = Record<string, string | null>;

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
  } catch {}
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

  try {
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
      const t = await res.text().catch(()=> '');
      return { ok:false, status:res.status, detail:t };
    }
    return { ok:true };
  } catch (e) {
    return { ok:false, error:String(e) };
  }
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
  const bRef = db.collection('bookings').doc(refOrId);
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

function successRedirect(req: NextRequest, ref: string) {
  const successPath = process.env.SUCCESS_PAGE_PATH || '/success';
  const url = successPath.startsWith('http')
    ? new URL(successPath)
    : new URL(successPath, req.nextUrl.origin);
  if (ref) url.searchParams.set('ref', ref);
  return NextResponse.redirect(url, { status: 302 });
}

/** Build a simple, friendly receipt text from the booking doc + return map */
function buildReceiptText(booking: any, map: ReturnMap) {
  const lines = [
    'Thank you — your Good2Go booking is confirmed.',
    '',
    `Reference: ${booking?.ref || map['Reference'] || ''}`,
    `Name: ${booking?.name || booking?.clientName || ''}`,
    `Email: ${booking?.email || ''}`,
    `Region: ${booking?.region || ''}`,
    `Date: ${booking?.dateISO || ''}`,
    `Time: ${booking?.start ? `${booking.start}–${booking.end || ''}` : ''}`,
    `Venue: ${booking?.venueAddress || ''}`,
  ];

  if (map['Amount']) lines.push(`Amount: ${map['Amount']}`);
  if (map['TransactionId']) lines.push(`Transaction: ${map['TransactionId']}`);

  lines.push('', 'We look forward to seeing you.', '— Good2Go');
  return lines.filter(Boolean).join('\n');
}

async function sendConfirmationFromBookingIfNeeded(
  db: FirebaseFirestore.Firestore,
  refOrId: string,
  map: ReturnMap
) {
  const bRef = db.collection('bookings').doc(refOrId);
  const snap = await bRef.get();
  if (!snap.exists) return { sent:false, reason:'no_booking' };

  const booking = snap.data() || {};
  const already = booking.confirmationSentAt ? true : false;
  if (already) return { sent:false, reason:'already_sent' };

  const emailFromReturn = map['Email'] || map['email'] || null;
  const email = emailFromReturn || booking.email || booking.yourEmail || null;
  if (!email) return { sent:false, reason:'no_email' };

  const text = buildReceiptText(booking, map);
  const res = await sendConfirmation(email, 'Booking Confirmation — Good2Go', text);

  if (res.ok) {
    await bRef.set({ confirmationSentAt: new Date().toISOString() }, { merge: true });
    return { sent:true };
  }
  return { sent:false, reason:'sendgrid_error', detail: res };
}

async function handle(map: ReturnMap, req: NextRequest) {
  try {
    const db = getFirestoreFromAny();

    if (db) {
      await persistPayment(db as any, map).catch(() => {});
      await updateBookingIfPossible(db as any, map).catch(() => {});
      // Always try to send a confirmation:
      const refOrId = (map['Reference'] || map['ref'] || '') as string;
      if (refOrId) await sendConfirmationFromBookingIfNeeded(db as any, refOrId, map).catch(() => {});
    }

    const debug = req.nextUrl.searchParams.get('debug');
    if (debug === '1') {
      return NextResponse.json({ ok:true, method: req.method, map }, { status: 200 });
    }

    const ref = (map['Reference'] || '') as string;
    return successRedirect(req, ref);
  } catch (e:any) {
    try {
      return successRedirect(req, (map?.['Reference'] as string) || '');
    } catch {
      return NextResponse.json({ ok:false, error:String(e) }, { status: 200 });
    }
  }
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

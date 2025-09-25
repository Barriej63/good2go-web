// app/api/worldline/return/route.ts
// Return webhook/redirect handler with GET + POST support (form + JSON)

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';
// ✅ ensure Node runtime (avoids Edge issues with admin SDK / require)
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
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
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
    return { ok:false, error: String(e) };
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
  // ✅ Always absolute URL (Edge sometimes 500s on relative)
  const url = successPath.startsWith('http')
    ? new URL(successPath)
    : new URL(successPath, req.nextUrl.origin);
  if (ref) url.searchParams.set('ref', ref);
  return NextResponse.redirect(url, { status: 302 });
}

async function handle(map: ReturnMap, req: NextRequest) {
  try {
    const db = getFirestoreFromAny();

    // Persist and update booking, but never let failures crash the redirect
    if (db) {
      await persistPayment(db as any, map).catch(() => {});
      await updateBookingIfPossible(db as any, map).catch(() => {});
    }

    const email = map['Email'] || map['email'] || null;
    if (email) {
      await sendConfirmation(email, 'Booking Confirmation', `Your booking ${map['Reference'] || ''} is confirmed.`)
        .catch(() => {});
    }

    const debug = req.nextUrl.searchParams.get('debug');
    if (debug === '1') {
      return NextResponse.json({ ok:true, method: req.method, map }, { status: 200 });
    }

    const ref = (map['Reference'] || '') as string;
    return successRedirect(req, ref);
  } catch (e:any) {
    // Last-ditch protection — never strand the customer
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

// app/api/worldline/return/route.ts
// Fixed SendGrid header block (no escaped backticks)

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

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
    const t = await res.text();
    return { ok:false, status:res.status, detail:t };
  }
  return { ok:true };
}

export async function GET(req: NextRequest) {
  const db = getFirestoreFromAny();
  if (!db) return NextResponse.json({ ok:false, error:'no_db' });

  const url = new URL(req.url);
  const ref = url.searchParams.get('Reference');
  const tx = url.searchParams.get('TransactionId');
  const status = url.searchParams.get('Status') || '';
  const email = url.searchParams.get('Email') || '';

  // persist payment doc
  if (tx) {
    await db.collection('payments').doc(tx).set({
      reference: ref,
      status,
      createdAt: new Date().toISOString(),
    }, { merge: true });
  }

  // send confirmation if email is present
  if (email) {
    await sendConfirmation(email, 'Booking Confirmation', `Your booking ${ref} is confirmed.`);
  }

  return NextResponse.json({ ok:true, ref, tx, status });
}

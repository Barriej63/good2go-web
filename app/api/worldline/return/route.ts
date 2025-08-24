// app/api/worldline/return/route.ts
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function db() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref');
  if (!ref) return NextResponse.json({ ok:false, error:'missing ref' }, { status:400 });

  const q = await db().collection('bookings').where('bookingRef','==',ref).limit(1).get();
  if (q.empty) return NextResponse.json({ ok:false, error:'not found' }, { status:404 });

  await q.docs[0].ref.update({ status:'paid', paidAt: new Date() });
  return NextResponse.json({ ok:true });
}

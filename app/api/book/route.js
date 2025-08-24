// app/api/book/route.js
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function genRef(prefix = 'G2G') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function GET() {
  try {
    const db = getAdminDb();
    await db.listCollections();
    return NextResponse.json({ ok:true, admin:'ready' });
  } catch {
    return NextResponse.json({ ok:false, error:'admin_init_failed' }, { status:500 });
  }
}

export async function POST(req) {
  const origin = new URL(req.url).origin;
  try {
    const body = await req.json();
    const required = ['name','email','region','slot','consentAccepted'];
    for(const k of required){
      if(!body[k]) return NextResponse.json({ error:`Missing field: ${k}` },{status:400});
    }
    if(body.consentAccepted !== true){
      return NextResponse.json({ error:'Consent required' },{status:400});
    }

    const db = getAdminDb();
    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || 'G2G');
    const pkg = String(body.packageType||'').toLowerCase();
    const amountCents = pkg === 'package4' ? 19900 : 6500;

    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone||'',
      region: body.region,
      time: body.slot,
      venue: body.venue || body.venueAddress || '',
      referringProfessional:{ name: body.referringName||'' },
      medicalEmail: body.medicalEmail||null,
      consent:{
        accepted:true,
        acceptedAt:new Date(),
        duration: body.consentDuration || 'Until Revoked'
      },
      dateISO: body.dateISO||null,
      start: body.start||null,
      end: body.end||null,
      venueAddress: body.venueAddress||body.venue||'',
      packageType: pkg||'baseline',
      allDates: Array.isArray(body.allDates)? body.allDates : (body.dateISO?[body.dateISO]:[]),
      amountCents,
      currency:'NZD',
      bookingRef,
      status:'pending',
      createdAt:new Date()
    };
    await db.collection('bookings').doc(bookingRef).set(payload);

    const redirectUrl = new URL(`/api/worldline/create?ref=${encodeURIComponent(bookingRef)}&amount=${amountCents}`, origin).toString();
    return NextResponse.json({ ok:true, bookingRef, redirectUrl });
  }catch{
    const fallback = new URL(`/success?ref=ERR`, origin).toString();
    return NextResponse.json({ error:'server_error', redirectUrl:fallback },{status:500});
  }
}

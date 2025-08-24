import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function markPaid(bid:string){
  try{
    const db=getAdminDb();
    await db.collection('bookings').doc(bid).set({ status:'paid', paidAt:new Date() },{merge:true});
  }catch{}
}

export async function GET(req:NextRequest){
  const url=new URL(req.url);
  const bid=url.searchParams.get('bid')||url.searchParams.get('ref')||'';
  if(bid) await markPaid(bid);
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>Booking Successful</title></head>
  <body><h1>Booking Successful</h1><p>Reference: <strong>${bid}</strong></p><p><a href="/success?ref=${encodeURIComponent(bid)}">Continue</a></p></body></html>`;
  return new NextResponse(html,{headers:{'Content-Type':'text/html'}});
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function abs(origin:string, pathOrUrl:string):string {
  try{ return new URL(pathOrUrl, origin).toString(); }catch{ return pathOrUrl; }
}
function pickPaymentUrl(j:any):string|null {
  if(!j||typeof j!=='object') return null;
  for(const k of ['redirectUrl','paymentUrl','url','hppUrl','webPaymentUrl']){
    const v=(j as any)[k]; if(typeof v==='string'&&v.startsWith('http')) return v;
  }
  if((j as any)._links){
    for(const key of Object.keys((j as any)._links)){
      const v=(j as any)._links[key]; if(v&&typeof v.href==='string'&&v.href.startsWith('http')) return v.href;
    }
  }
  return null;
}

export async function GET(req:NextRequest){
  const url=new URL(req.url); const origin=url.origin;
  const ref=url.searchParams.get('ref')||url.searchParams.get('bid'); let amount=url.searchParams.get('amount')||'';
  if(!ref){ return NextResponse.json({ ok:false,error:'missing_ref'}, {status:400}); }

  const base=(process.env.WORLDLINE_API_BASE||'').replace(/\\/$/,'')||
    (/^(prod|production|live)$/i.test(process.env.WORLDLINE_ENV||'')? 'https://secure.paymarkclick.co.nz':'https://uat.paymarkclick.co.nz');
  const endpoint=`${base}/api/payment`;

  const accountId=process.env.WORLDPAY_ACCOUNT_ID||process.env.WORLDLINE_ACCOUNT_ID||'';
  const user=process.env.WORLDPAY_USERNAME||process.env.WORLDLINE_USERNAME||'';
  const pass=process.env.WORLDPAY_PASSWORD||process.env.WORLDLINE_PASSWORD||'';
  const auth='Basic '+Buffer.from(`${user}:${pass}`).toString('base64');

  const successUrl=abs(origin, process.env.WORLDLINE_SUCCESS_URL||`/api/worldline/return?bid=${encodeURIComponent(ref)}`);
  const cancelUrl=abs(origin, process.env.WORLDLINE_CANCEL_URL||`/api/worldline/return?bid=${encodeURIComponent(ref)}&cancel=1`);
  const errorUrl=abs(origin, process.env.WORLDLINE_ERROR_URL||`/api/worldline/return?bid=${encodeURIComponent(ref)}&error=1`);

  if(!amount){
    try{
      const db=getAdminDb();
      const snap=await db.collection('bookings').doc(ref).get();
      if(snap.exists){ const data=snap.data() as any; if(data?.amountCents) amount=String(data.amountCents); }
    }catch{}
  }
  const amountCents=parseInt(amount,10);
  if(!amountCents||amountCents<=0){
    if(process.env.DEBUG_HPP==='1'){ return NextResponse.json({ok:false,error:'missing_or_invalid_amount',ref},{status:400}); }
    return NextResponse.redirect(abs(origin,`/success?ref=${encodeURIComponent(ref)}`),302);
  }

  const body={ amount:{total:amountCents,currency:'NZD'}, merchant:{merchantId:accountId}, transaction:{reference:ref},
    urls:{success:successUrl,cancel:cancelUrl,error:errorUrl}};

  try{
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':auth},body:JSON.stringify(body)});
    const text=await r.text(); let json:any=null; try{json=JSON.parse(text);}catch{}
    if(!r.ok){
      if(process.env.DEBUG_HPP==='1'){ return NextResponse.json({ok:false,stage:'worldline_create',status:r.status,endpoint,requestBody:body,response:text},{status:r.status||500}); }
      return NextResponse.redirect(abs(origin,`/success?ref=${encodeURIComponent(ref)}`),302);
    }
    const payUrl=pickPaymentUrl(json); if(payUrl) return NextResponse.redirect(payUrl,302);
    if(process.env.DEBUG_HPP==='1'){ return NextResponse.json({ok:false,stage:'no_link_found',endpoint,requestBody:body,response:json??text},{status:502}); }
    return NextResponse.redirect(abs(origin,`/success?ref=${encodeURIComponent(ref)}`),302);
  }catch(e:any){
    if(process.env.DEBUG_HPP==='1'){ return NextResponse.json({ok:false,stage:'exception',message:String(e)},{status:500}); }
    return NextResponse.redirect(abs(origin,`/success?ref=${encodeURIComponent(ref)}`),302);
  }
}

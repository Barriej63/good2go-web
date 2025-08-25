import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function pad(n){ return String(n).padStart(2,'0'); }
function genRef(prefix='G2G'){
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function POST(req){
  try{
    const payload = await req.json().catch(()=>({}));
    // Accept multiple shapes from the booking UI
    const name = payload?.clientName || payload?.name || payload?.fullName || null;
    const email = payload?.clientEmail || payload?.email || null;
    const region = payload?.region || payload?.selectedRegion || null;
    const slotId = payload?.slotId || payload?.id || payload?.bookingId || null;
    const amount = payload?.amount || payload?.price || payload?.amountCents || null;

    const warnings = [];
    if(!name) warnings.push('missing_name');
    if(!email) warnings.push('missing_email');
    if(!slotId) warnings.push('missing_slotId');

    // We no longer fail hard on missing fields; we still generate a bookingRef so payment can proceed.
    const bookingRef = genRef('G2G');

    return NextResponse.json({ok:true, bookingRef, used:{name,email,region,slotId,amount}, warnings});
  }catch(e){
    return NextResponse.json({ok:false, error: e?.message || 'server_error'}, {status:500});
  }
}

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
    const payload = await req.json();
    if(!payload?.clientName || !payload?.clientEmail){
      return NextResponse.json({ok:false, error:'missing_fields'}, {status:400});
    }
    const bookingRef = genRef('G2G');
    // Normally you would write the booking to Firestore here, we return a stub.
    return NextResponse.json({ok:true, bookingRef});
  }catch(e){
    return NextResponse.json({ok:false, error: e?.message || 'server_error'}, {status:500});
  }
}

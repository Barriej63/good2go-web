// app/api/book/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function genRef(prefix='G2G') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const bookingRef = genRef();
    return NextResponse.json({ ok:true, bookingRef });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e) }, { status:500 });
  }
}

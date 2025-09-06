import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);        // ✅ pass the response
  return res;
}

// (Optional) support POST if your UI calls it:
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}

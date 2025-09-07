import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}

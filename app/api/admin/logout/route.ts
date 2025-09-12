// /app/api/admin/logout/route.ts
import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/adminAuth';

export async function POST() {
  // clear cookie (make sure clearAdminCookie removes g2g_admin and g2g_role)
  const res = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'https://book.good2go-rth.com'));
  clearAdminCookie(res); 
  return res;
}


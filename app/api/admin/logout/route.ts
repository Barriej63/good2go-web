// app/api/admin/logout/route.ts
import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

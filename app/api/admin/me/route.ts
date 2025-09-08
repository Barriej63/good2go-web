// /app/api/admin/me/route.ts
import { NextResponse } from 'next/server';
import { getAdminRole, isAdminCookie } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ok = isAdminCookie();
  const role = ok ? getAdminRole() : null;
  return NextResponse.json({ ok, role });
}

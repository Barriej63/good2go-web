import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';

export async function GET() {
  const ok = await isAdminCookie();
  const role = ok ? await getAdminRole() : null;
  return NextResponse.json({ ok, role });
}

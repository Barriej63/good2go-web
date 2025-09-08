import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  const ok = await isAdminCookie();
  return NextResponse.json({ ok });
}

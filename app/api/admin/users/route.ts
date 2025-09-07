import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // Placeholder — in the future you can return named users here.
  return NextResponse.json({ ok: true, items: [] });
}

import { NextResponse } from 'next/server';
import { setAdminCookie, clearAdminCookie } from '@/lib/adminAuth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || '');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  setAdminCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearAdminCookie(res);
  return res;
}

import { NextResponse } from 'next/server';
import { setAdminCookie, roleFromToken } from '@/lib/adminAuth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || '');
  const role = roleFromToken(token);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, role });
  setAdminCookie(res, token);
  return res;
}


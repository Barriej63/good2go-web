// /app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { roleFromToken, setAdminCookie } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: '' }));
  const role = roleFromToken(token);
  if (!role) {
    return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, role });
  setAdminCookie(res, token);
  return res;
}

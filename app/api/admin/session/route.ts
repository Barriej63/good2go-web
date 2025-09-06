// app/api/admin/session/route.ts
import { NextResponse } from 'next/server';
import { cookieHeadersFor, clearCookieHeaders } from '@/lib/adminAuth';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  cookieHeadersFor(token).forEach(([k, v]) => res.headers.append(k, v));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearCookieHeaders().forEach(([k, v]) => res.headers.append(k, v));
  return res;
}

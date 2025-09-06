import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  const ok = token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL('/admin', req.url), { status: 303 });
  res.cookies.set('admin', '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h
  });
  return res;
}

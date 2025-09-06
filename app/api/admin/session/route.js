// app/api/admin/session/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { setAdminCookie } = await import('@/lib/adminAuth');
  const { token } = await req.json().catch(() => ({}));
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
  }
  if (token !== (process.env.ADMIN_TOKEN || '')) {
    return NextResponse.json({ ok: false, error: 'bad_token' }, { status: 401 });
  }
  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const { clearAdminCookie } = await import('@/lib/adminAuth');
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

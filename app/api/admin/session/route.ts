import { NextResponse } from 'next/server';
import { setAdminCookie, clearAdminCookie } from '@/lib/adminAuth';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({} as { token?: string }));
  const adminToken = process.env.ADMIN_TOKEN || '';

  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
  }
  if (!adminToken || token !== adminToken) {
    return NextResponse.json({ ok: false, error: 'bad_token' }, { status: 401 });
  }

  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

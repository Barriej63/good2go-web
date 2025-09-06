import { NextResponse } from 'next/server';
import { setAdminCookie, clearAdminCookie, isAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  // status
  return NextResponse.json({ ok: true, admin: await isAdminCookie() });
}

export async function POST(req: Request) {
  // login
  const body = await req.json().catch(() => ({}));
  const token = body?.token ?? new URL(req.url).searchParams.get('token');
  const adminToken = process.env.ADMIN_TOKEN ?? '';

  if (!token || !adminToken || token !== adminToken) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }

  await setAdminCookie(token);
  return NextResponse.json({ ok: true, admin: true });
}

export async function DELETE() {
  // logout
  await clearAdminCookie();
  return NextResponse.json({ ok: true, admin: false });
}


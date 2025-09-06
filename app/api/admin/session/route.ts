// app/api/admin/session/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie, setAdminCookie, clearAdminCookie } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

    const adminToken = process.env.ADMIN_TOKEN ?? '';
    if (!adminToken) return NextResponse.json({ ok: false, error: 'no_admin_token' }, { status: 500 });

    if (token === adminToken) {
      await setAdminCookie(token);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const ok = await isAdminCookie();
  return NextResponse.json({ ok });
}

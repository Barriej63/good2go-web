// app/api/admin/session/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie, setAdminCookie, clearAdminCookie } from '@/lib/adminAuth';

export async function GET() {
  const ok = await isAdminCookie();
  return NextResponse.json({ ok });
}

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({ token: '' }));
  if (!token) return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });

  const valid = token === (process.env.ADMIN_TOKEN ?? '');
  if (!valid) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 });

  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

// app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { setAdminCookie } from '@/lib/adminAuth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';

  if (!token || token !== adminToken) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
  }

  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}


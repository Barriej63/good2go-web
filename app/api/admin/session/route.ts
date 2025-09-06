import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
    }
    cookies().set('g2g_admin', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }
}

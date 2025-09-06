import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'g2g_admin';
const COOKIE_MAX_AGE = 60 * 60 * 8;

export async function isAdminCookie() {
  return cookies().get(COOKIE_NAME)?.value === process.env.ADMIN_TOKEN;
}

export function setAdminCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
}



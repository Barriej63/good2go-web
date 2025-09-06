import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';
const ONE_DAY = 60 * 60 * 24;

export async function setAdminCookie(token: string) {
  'use server';
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ONE_DAY,
  });
}

export async function clearAdminCookie() {
  'use server';
  cookies().set(COOKIE, '', { path: '/', maxAge: 0 });
}

export async function isAdminCookie(): Promise<boolean> {
  'use server';
  const token = cookies().get(COOKIE)?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}

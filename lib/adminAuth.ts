import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';
const ONE_DAY = 60 * 60 * 24;

/** Set the admin cookie after a successful login. */
export async function setAdminCookie(token: string) {
  'use server';
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ONE_DAY,
  });
}

/** Clear the admin cookie (logout). */
export async function clearAdminCookie() {
  'use server';
  cookies().set(COOKIE, '', { path: '/', maxAge: 0 });
}

/** Check if current request carries a valid admin cookie. */
export async function isAdminCookie(): Promise<boolean> {
  'use server';
  const token = cookies().get(COOKIE)?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}


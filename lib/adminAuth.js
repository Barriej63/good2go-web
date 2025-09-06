'use server';

import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';
const ONE_DAY = 60 * 60 * 24;

/**
 * Server Action: check if the current request has a valid admin cookie.
 */
export async function isAdminCookie(): Promise<boolean> {
  const token = cookies().get(COOKIE)?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}

/**
 * Server Action: set the admin cookie from a validated token.
 */
export async function setAdminCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_DAY,
  });
}

/**
 * Server Action: clear the admin cookie.
 */
export async function clearAdminCookie() {
  cookies().delete(COOKIE);
}

// lib/adminAuth.ts
'use server';

import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';

export async function isAdminCookie(): Promise<boolean> {
  const token = cookies().get(COOKIE)?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}

export async function setAdminCookie(token: string) {
  // 24h
  const ONE_DAY = 60 * 60 * 24;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: ONE_DAY,
  });
}

export async function clearAdminCookie() {
  cookies().delete(COOKIE);
}

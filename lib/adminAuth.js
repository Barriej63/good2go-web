// lib/adminAuth.ts
import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';
const ONE_DAY = 60 * 60 * 24;

export function isAdminCookie(): boolean {
  const c = cookies().get(COOKIE)?.value;
  return !!c && c === process.env.ADMIN_TOKEN;
}

export function cookieHeadersFor(token: string) {
  return [
    [
      'Set-Cookie',
      `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${ONE_DAY}; SameSite=Lax; HttpOnly; Secure`,
    ],
  ] as [string, string][];
}

export function clearCookieHeaders() {
  return [
    ['Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`],
  ] as [string, string][];
}

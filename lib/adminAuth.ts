// /lib/adminAuth.ts  (SERVER ONLY)
import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type AdminRole = 'superadmin' | 'coach' | 'viewer' | null;

export const COOKIE_NAME = 'g2g_admin';
export const ROLE_COOKIE   = 'g2g_role';
export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

/** Map an incoming token to a role using env vars. */
export function roleFromToken(token: string | null | undefined): AdminRole {
  if (!token) return null;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return 'superadmin';
  if (process.env.COACH_TOKEN && token === process.env.COACH_TOKEN) return 'coach';
  if (process.env.VIEWER_TOKEN && token === process.env.VIEWER_TOKEN) return 'viewer';
  return null;
}

export async function isAdminCookie(): Promise<boolean> {
  const jar = cookies();
  const token = jar.get(COOKIE_NAME)?.value || '';
  const role  = (jar.get(ROLE_COOKIE)?.value as AdminRole) || null;
  const mapped = roleFromToken(token);
  return Boolean(token && role && mapped && role === mapped);
}

export async function getAdminRole(): Promise<AdminRole> {
  const jar = cookies();
  const token = jar.get(COOKIE_NAME)?.value || '';
  const role  = (jar.get(ROLE_COOKIE)?.value as AdminRole) || null;
  const mapped = roleFromToken(token);
  return token && role && mapped && role === mapped ? mapped : null;
}

export function setAdminCookie(res: NextResponse, token: string) {
  const role = roleFromToken(token);
  if (!role) throw new Error('invalid_token_role');

  res.cookies.set({
    name: COOKIE_NAME, value: token, path: '/', sameSite: 'lax',
    httpOnly: true, secure: true, maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set({
    name: ROLE_COOKIE, value: role, path: '/', sameSite: 'lax',
    httpOnly: true, secure: true, maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
  res.cookies.set({ name: ROLE_COOKIE, value: '', path: '/', maxAge: 0 });
}

/** Small helper for pages that want to restrict editing to superadmins. */
export function requireSuperadmin(role: AdminRole) {
  return role === 'superadmin';
}

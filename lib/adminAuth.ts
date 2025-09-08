// /lib/adminAuth.ts  (SERVER ONLY)
import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type AdminRole = 'superadmin' | 'coach' | 'viewer';

const COOKIE_NAME = 'g2g_admin';
const ROLE_COOKIE  = 'g2g_role';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

function roleForToken(token: string | undefined | null): AdminRole | null {
  if (!token) return null;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return 'superadmin';
  if (process.env.COACH_TOKEN && token === process.env.COACH_TOKEN) return 'coach';
  if (process.env.VIEWER_TOKEN && token === process.env.VIEWER_TOKEN) return 'viewer';
  return null;
}

/** True if an admin cookie is present */
export async function isAdminCookie(): Promise<boolean> {
  const jar = cookies();
  const has = !!jar.get(COOKIE_NAME)?.value || !!jar.get(ROLE_COOKIE)?.value;
  return has;
}

/** Read current role from cookie (or null) */
export async function getAdminRole(): Promise<AdminRole | null> {
  const jar = cookies();
  const role = jar.get(ROLE_COOKIE)?.value as AdminRole | undefined;
  return role ?? null;
}

/** Guard helper used by API routes/pages that already know the role */
export function requireSuperadmin(role: AdminRole | null): boolean {
  return role === 'superadmin';
}

/** Set auth cookies on a NextResponse (used in /api/admin/login) */
export function setAdminCookie(res: NextResponse, token: string) {
  const role = roleForToken(token);
  if (!role) throw new Error('invalid_token');

  res.cookies.set({
    name: COOKIE_NAME,
    value: '1',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
  res.cookies.set({
    name: ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
}

/** Clear both cookies (used in /api/admin/logout) */
export function clearAdminCookie(res: NextResponse) {
  // Expire both cookies
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
  res.cookies.set({ name: ROLE_COOKIE,  value: '', path: '/', maxAge: 0 });
}


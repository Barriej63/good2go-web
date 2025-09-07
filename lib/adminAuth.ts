import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'g2g_admin';
const ROLE_COOKIE = 'g2g_role';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

export type AdminRole = 'superadmin' | 'coach' | 'viewer';

export function roleFromToken(token: string): AdminRole | null {
  if (!token) return null;
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return 'superadmin';
  if (process.env.COACH_TOKEN && token === process.env.COACH_TOKEN) return 'coach';
  if (process.env.VIEWER_TOKEN && token === process.env.VIEWER_TOKEN) return 'viewer';
  return null;
}

export async function isAdminCookie() {
  const jar = cookies();
  const token = jar.get(COOKIE_NAME)?.value || '';
  const role = jar.get(ROLE_COOKIE)?.value as AdminRole | undefined;
  const mapped = roleFromToken(token);
  return Boolean(token && role && mapped && mapped === role);
}

export async function getAdminRole(): Promise<AdminRole | null> {
  const jar = cookies();
  const token = jar.get(COOKIE_NAME)?.value || '';
  const role = jar.get(ROLE_COOKIE)?.value as AdminRole | undefined;
  const mapped = roleFromToken(token);
  if (!token || !role || !mapped || mapped !== role) return null;
  return role;
}

export function setAdminCookie(res: NextResponse, token: string) {
  const role = roleFromToken(token);
  if (!role) throw new Error('invalid_token_role');

  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  res.cookies.set({
    name: ROLE_COOKIE,
    value: role,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie(res: NextResponse) {
  res.cookies.set({ name: COOKIE_NAME, value: '', path: '/', maxAge: 0 });
  res.cookies.set({ name: ROLE_COOKIE, value: '', path: '/', maxAge: 0 });
}

// Keep everything you already have above… then add:

export function hasRole(
  role: AdminRole | null | undefined,
  allowed: AdminRole | AdminRole[]
): boolean {
  if (!role) return false;
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(role);
}

export function requireSuperadmin(role: AdminRole | null | undefined): boolean {
  return role === 'superadmin';
}

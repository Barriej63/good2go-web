'use server';

import { cookies } from 'next/headers';

const COOKIE = 'g2g_admin';
// (keep if you need it elsewhere)
// const ONE_DAY = 60 * 60 * 24;

export function isAdminCookie() {
  const token = cookies().get(COOKIE)?.value;
  const adminToken = process.env.ADMIN_TOKEN || '';
  return Boolean(token && adminToken && token === adminToken);
}

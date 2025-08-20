
// lib/adminAuth.js
export function verifyAdminToken(token) {
  return token === process.env.ADMIN_TOKEN;
}

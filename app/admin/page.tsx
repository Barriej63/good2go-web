import Link from 'next/link';
import { isAdminCookie } from '@/lib/adminAuth';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) {
    return (
      <main style={{ maxWidth: 720, margin: '64px auto', fontFamily: 'system-ui' }}>
        <h1>Admin</h1>
        <p>Not signed in.</p>
        <p><Link href="/admin/login">Go to login →</Link></p>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', fontFamily: 'system-ui' }}>
      <h1>Admin</h1>
      <ul>
        <li><Link href="/admin/bookings">Bookings</Link></li>
        <li><Link href="/admin/reconcile">Reconcile</Link></li>
      </ul>
      <form action="/api/admin/session" method="post">
        <input type="hidden" name="_method" value="DELETE" />
      </form>
      <p style={{ marginTop: 24 }}>
        <a href="/api/admin/session" onClick={async (e) => { e.preventDefault(); await fetch('/api/admin/session', { method: 'DELETE' }); location.href = '/admin/login'; }}>
          Logout
        </a>
      </p>
    </main>
  );
}

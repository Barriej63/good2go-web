// app/admin/page.tsx
import Link from 'next/link';
import { isAdminCookie } from '@/lib/adminAuth';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) {
    return (
      <main style={{ maxWidth: 720, margin: '64px auto', padding: 16 }}>
        <h1>Admin</h1>
        <p>Not signed in. Go to <Link href="/admin/login">Admin Login</Link>.</p>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: 16 }}>
      <h1>Admin</h1>
      <ul>
        <li><Link href="/admin/bookings">Bookings</Link></li>
        <li><Link href="/admin/bookings-export">Export CSV</Link></li>
        <li><Link href="/admin/reconcile">Reconcile</Link></li>
        <li><Link href="/admin/config">Config</Link></li>
      </ul>
    </main>
  );
}

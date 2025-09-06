// app/admin/page.tsx
import Link from 'next/link';
import { isAdminCookie } from '@/lib/adminAuth';

export default function AdminHome() {
  const authed = isAdminCookie();

  if (!authed) {
    // Do NOT redirect — show a link. This avoids any loop.
    return (
      <main style={{ maxWidth: 680, margin: '64px auto', fontFamily: 'system-ui' }}>
        <h1>Admin</h1>
        <p>You’re not signed in.</p>
        <p><Link href="/admin/login">Go to Admin Login →</Link></p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 960, margin: '48px auto', fontFamily: 'system-ui' }}>
      <h1>Admin</h1>
      <p>Signed in. (Content goes here.)</p>
      <form action="/api/admin/session" method="POST" onSubmit={(e) => {
        e.preventDefault();
        fetch('/api/admin/session', { method: 'DELETE' }).then(() => location.reload());
      }}>
        <button type="submit" style={{ marginTop: 16 }}>Sign out</button>
      </form>
    </main>
  );
}


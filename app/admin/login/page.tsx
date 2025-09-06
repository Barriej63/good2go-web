// app/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // ensure no stale cache

export default async function AdminHome() {
  const isAuthed = cookies().get('admin')?.value === '1';
  if (!isAuthed) redirect('/admin/login');

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin</h1>
      <p>Welcome. You are authenticated.</p>

      <ul>
        <li><a href="/admin/bookings">Bookings</a></li>
        <li><a href="/api/admin/logout">Log out</a></li>
      </ul>
    </main>
  );
}

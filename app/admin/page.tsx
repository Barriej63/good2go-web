import { redirect } from 'next/navigation';
import { isAdminCookie } from '@/lib/adminAuth';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login'); // <— only /admin redirects to login

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>
      {/* Your admin UI here – it can call /api/admin/bookings etc. */}
    </main>
  );
}


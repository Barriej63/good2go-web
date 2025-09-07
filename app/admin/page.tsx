import { redirect } from 'next/navigation';
import { isAdminCookie } from '@/lib/adminAuth';
import LogoutButton from '@/components/admin/LogoutButton';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');

  return (
    <main className="p-6">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <LogoutButton />
      </div>

      {/* Example content area */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded border p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Bookings</h2>
          <p>Hook this to /api/admin/bookings to show recent bookings.</p>
        </div>

        <div className="rounded border p-4 shadow-sm">
          <h2 className="font-semibold mb-2">Configuration</h2>
          <p>Regions, timeslots, and settings.</p>
        </div>
      </section>
    </main>
  );
}

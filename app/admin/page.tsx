import { redirect } from 'next/navigation';
import { isAdminCookie } from '@/lib/adminAuth';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded border p-4 shadow-sm">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        <p>Use the Bookings tab to view the latest bookings.</p>
      </div>
      <div className="rounded border p-4 shadow-sm">
        <h2 className="font-semibold mb-2">Configuration</h2>
        <p>Regions & timeslots are editable under Config (superadmin).</p>
      </div>
    </div>
  );
}


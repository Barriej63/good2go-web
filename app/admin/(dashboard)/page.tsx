import { redirect } from 'next/navigation';
import { isAdminCookie } from '@/lib/adminAuth';

export default async function AdminHome() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Recent activity</h2>
        <p className="text-sm text-slate-600">Use the Bookings tab to view the latest bookings.</p>
      </section>
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-semibold mb-1">Configuration</h2>
        <p className="text-sm text-slate-600">Regions & timeslots are editable under Config (superadmin).</p>
      </section>
    </div>
  );
}

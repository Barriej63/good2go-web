import Sidebar from '@/components/admin/Sidebar';
import LogoutButton from '@/components/admin/LogoutButton';
import { getAdminRole } from '@/lib/adminAuth';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();

  return (
    <div className="min-h-[calc(100vh-56px)] flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-4 flex items-center justify-between shadow-sm">
          <div className="text-sm">
            Signed in as: <span className="font-semibold capitalize">{role ?? 'unknown'}</span>
          </div>
          <LogoutButton />
        </header>
        <main className="p-6 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

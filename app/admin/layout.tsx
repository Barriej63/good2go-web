import Sidebar from '@/components/admin/Sidebar';
import LogoutButton from '@/components/admin/LogoutButton';
import { getAdminRole } from '@/lib/adminAuth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <header className="h-14 bg-white/90 backdrop-blur border-b border-slate-200 px-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Signed in as: <span className="font-medium capitalize">{role ?? 'unknown'}</span>
            </div>
            <LogoutButton />
          </header>
          <main className="p-6 max-w-[1200px] mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

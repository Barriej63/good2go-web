import Sidebar from '@/components/admin/Sidebar';
import LogoutButton from '@/components/admin/LogoutButton';
import { getAdminRole } from '@/lib/adminAuth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAdminRole(); // shown in header

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="text-sm text-gray-600">Signed in as: <span className="font-medium">{role || 'unknown'}</span></div>
          <LogoutButton />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

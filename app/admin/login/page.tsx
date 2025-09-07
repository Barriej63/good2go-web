import { isAdminCookie } from '@/lib/adminAuth';
import { redirect } from 'next/navigation';
import LoginForm from './ui/LoginForm';

export default async function AdminLogin() {
  const ok = await isAdminCookie();
  if (ok) redirect('/admin'); // already signed in

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
        <p className="text-sm text-slate-600 mb-4">Enter your one-time admin token.</p>
        <LoginForm />
      </div>
    </main>
  );
}

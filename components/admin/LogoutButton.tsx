'use client';

export default function LogoutButton() {
  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'GET' });
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={doLogout}
      className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-3 py-2 text-white text-sm
                 shadow-sm hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
    >
      Logout
    </button>
  );
}

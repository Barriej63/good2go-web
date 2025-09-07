'use client';

export default function LogoutButton() {
  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'GET' });
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={doLogout}
      className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 text-sm shadow-sm"
    >
      Logout
    </button>
  );
}

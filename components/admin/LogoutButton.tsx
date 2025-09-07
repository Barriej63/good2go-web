'use client';

export default function LogoutButton() {
  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'GET' });
    window.location.href = '/admin/login';
  }

  return (
    <button
      onClick={doLogout}
      className="ml-auto bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  );
}

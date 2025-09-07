// components/admin/LogoutButton.tsx
'use client';

export default function LogoutButton() {
  async function doLogout() {
    await fetch('/api/admin/logout', { method: 'GET' });
    window.location.href = '/admin/login';
  }
  return (
    <button
      onClick={doLogout}
      className="btn btn-ghost border-white/40 text-white hover:bg-white/10"
    >
      Logout
    </button>
  );
}

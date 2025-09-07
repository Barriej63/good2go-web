'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/config', label: 'Config' },
  { href: '/admin/users', label: 'Users' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r bg-white">
      <div className="p-4 text-lg font-semibold">Admin</div>
      <nav className="flex flex-col">
        {items.map(it => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-4 py-2 hover:bg-gray-100 ${active ? 'bg-gray-100 font-medium' : ''}`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

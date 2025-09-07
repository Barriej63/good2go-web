'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/config', label: 'Config' },
  { href: '/admin/users', label: 'Users' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-slate-800">
        <span className="font-semibold tracking-tight">Good2Go Admin</span>
      </div>
      <nav className="p-2 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'block rounded-md px-3 py-2 text-sm transition',
                active ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 text-[11px] text-slate-400 hidden md:block">
        © {new Date().getFullYear()} Good2Go
      </div>
    </aside>
  );
}

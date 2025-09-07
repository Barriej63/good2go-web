'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '🏠' },
  { href: '/admin/bookings', label: 'Bookings', icon: '📅' },
  { href: '/admin/config', label: 'Config', icon: '⚙️' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-white/90 backdrop-blur border-r border-slate-200">
      <div className="h-14 flex items-center gap-2 px-4 border-b">
        {/* If you have /public/logo.svg, uncomment next line */}
        {/* <img src="/logo.svg" alt="" className="h-6 w-6" /> */}
        <span className="text-lg font-semibold tracking-tight">Good2Go Admin</span>
      </div>
      <nav className="p-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                active
                  ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                  : 'text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
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


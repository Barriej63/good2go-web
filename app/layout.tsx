import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Good2Go',
  description: 'Concussion monitoring & booking system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-slate-50 text-slate-900"}>
        <SiteHeader />
        <main className="min-h-[80vh] container py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

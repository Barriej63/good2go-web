// app/layout.jsx
import './globals.css';
import SiteHeader from '@/components/SiteHeader';

export const metadata = {
  title: 'Good2Go',
  description: 'Recover Smart. Return Strong.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

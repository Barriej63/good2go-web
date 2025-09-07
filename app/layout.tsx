import './globals.css';
import SiteHeader from '@/components/SiteHeader';

export const metadata = {
  title: 'Good2Go',
  description: 'Concussion assessments & monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">
        <SiteHeader />
        <main className="min-h-[70vh]">{children}</main>
        <footer className="border-t">
          <div className="container mx-auto flex items-center justify-between px-4 py-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <img src="/good2go-logo1.png" alt="Good2Go" width={22} height={22} />
              © {new Date().getFullYear()} Good2Go
            </div>
            <div>Clinical decision support — simple booking, secure results.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}


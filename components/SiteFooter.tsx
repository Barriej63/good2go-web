import Image from 'next/image';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <Image src="/good2go-logo1.png" alt="Good2Go" width={28} height={28} />
            <span className="text-sm text-slate-500">
              © {new Date().getFullYear()} Good2Go
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Clinical decision support — simple booking, secure results.
          </div>
        </div>
      </div>
    </footer>
  );
}

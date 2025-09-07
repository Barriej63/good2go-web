import Image from 'next/image';

export default function SiteFooter() {
  return (
    <footer className="site-footer border-t border-slate-200 mt-10 bg-white">
      <div className="container flex items-center justify-between h-20">
        <div className="flex items-center gap-2">
          <Image
            src="/good2go-logo1.png"
            alt="Good2Go"
            width={32}
            height={32}
          />
          <span className="text-sm text-slate-500">
            © {new Date().getFullYear()} Good2Go
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Built for concussion monitoring
        </div>
      </div>
    </footer>
  );
}


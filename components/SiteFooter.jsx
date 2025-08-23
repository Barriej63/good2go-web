import Link from 'next/link';
import { SITE } from '@/content/siteContent';

export default function SiteFooter() {
  return (
    <footer className="border-t py-10 text-sm text-gray-600">
      <div className="mx-auto max-w-6xl px-4 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-semibold mb-2">{SITE.name}</div>
          <p>Concussion assessment & monitoring service.</p>
        </div>
        <div className="space-y-1">
          <div className="font-semibold">Links</div>
          <ul className="space-y-1">
            <li><Link href="/consent">Consent</Link></li>
            <li><Link href="/disclaimer">Disclaimer</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
          </ul>
        </div>
        <div className="space-y-1">
          <div className="font-semibold">Support</div>
          <p>Questions? <a className="underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a></p>
        </div>
      </div>
      <div className="mt-8 text-center text-xs">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</div>
    </footer>
  );
}

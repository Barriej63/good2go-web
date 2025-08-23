import Link from 'next/link';
import Section from '@/components/Section';
import CTAButton from '@/components/CTAButton';
import { SITE, LANDING } from '@/content/siteContent';

export const metadata = {
  title: `Good2Go — Concussion Monitoring & Return‑to‑Health`,
  description: LANDING.hero.subheading,
  openGraph: {
    title: 'Good2Go — Concussion Monitoring & Return‑to‑Health',
    description: LANDING.hero.subheading,
    url: `https://${SITE.domain}`,
    siteName: 'Good2Go',
  },
};

export default function HomePage() {
  return (
    <main>
      <div className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            {LANDING.hero.heading}
          </h1>
          <p className="mt-4 text-lg text-gray-700 max-w-3xl">
            {LANDING.hero.subheading}
          </p>
          <div className="mt-8 flex gap-3">
            <CTAButton href="/booking">{LANDING.hero.ctaText}</CTAButton>
            <Link className="px-6 py-3 rounded-xl border" href="#how">How it works</Link>
          </div>
          <div className="mt-6 text-sm text-gray-600">
            Regions: {SITE.regions.join(' • ')}
          </div>
        </div>
      </div>

      <Section id="features" title="Why Good2Go?">
        <div className="grid sm:grid-cols-2 gap-6">
          {LANDING.features.map((f, i) => (
            <div key={i} className="rounded-2xl border p-5 bg-white">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="how" title="How it works">
        <ol className="space-y-3 list-decimal ml-5 text-gray-700">
          {LANDING.how.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </Section>

      <Section id="trust" title="Safety & Privacy">
        <ul className="space-y-2 list-disc ml-5 text-gray-700">
          {LANDING.trust.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <div className="mt-6 flex gap-3">
          <Link className="underline" href="/privacy">Privacy Policy</Link>
          <Link className="underline" href="/consent">Consent</Link>
          <Link className="underline" href="/disclaimer">Disclaimer</Link>
        </div>
      </Section>

      <Section id="cta" className="bg-gray-50" title="Ready to book?">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p className="text-gray-700">Pick your region and time — instant confirmation.</p>
          <CTAButton />
        </div>
      </Section>
    </main>
  );
}

'use client';
import Link from 'next/link';
import { REGIONS } from '@/content/siteContent';

export default function RegionCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Choose your region</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {REGIONS.map(r => (
          <div key={r.id} className="rounded-2xl border p-5 shadow-sm bg-white">
            <div className="text-lg font-medium">{r.name}</div>
            <p className="text-gray-600 mt-1">{r.blurb}</p>
            <div className="mt-4">
              <Link
                href={{ pathname: '/booking', query: { region: r.name } }}
                className="inline-block px-4 py-2 rounded-xl bg-black text-white"
              >
                {r.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'FAQ — Good2Go',
  description: 'Frequently asked questions.',
};

const QA = [
  ['How long does the assessment take?', 'Most sessions take 15–20 minutes including setup.'],
  ['Can I reschedule?', 'Yes. Reply to your confirmation email or contact support.'],
  ['Is this a medical diagnosis?', 'No. Good2Go provides non‑diagnostic indicators to support decision‑making.'],
];

export default function FAQPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
      <div className="mt-6 space-y-4">
        {QA.map(([q, a], i) => (
          <div key={i} className="rounded-2xl border p-4">
            <h3 className="font-semibold">{q}</h3>
            <p className="mt-1 text-gray-700">{a}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link className="px-5 py-3 rounded-xl border" href="/booking">Book now</Link>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { SITE } from '@/content/siteContent';

export const metadata = {
  title: 'Privacy Policy — Good2Go',
  description: 'How Good2Go collects, uses, and protects your information.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-gray-700">
        We collect only the information required to provide the Good2Go service and to improve it over time.
        This includes contact details, booking information, and assessment metrics.
      </p>

      <h2 className="text-xl font-semibold mt-8">Your Rights</h2>
      <ul className="list-disc ml-6 mt-3 text-gray-700 space-y-2">
        <li>Access and correction of your information.</li>
        <li>Deletion on request, subject to legal obligations.</li>
        <li>Withdrawal of consent for processing where applicable.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8">Contact</h2>
      <p className="mt-2 text-gray-700">
        Questions? Contact <a className="underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>

      <div className="mt-8">
        <Link className="px-5 py-3 rounded-xl border" href="/">Back to Home</Link>
      </div>
    </main>
  );
}

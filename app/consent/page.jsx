import Link from 'next/link';
import Section from '@/components/Section';
import { SITE } from '@/content/siteContent';

export const metadata = {
  title: 'Consent — Good2Go',
  description: 'Client consent for Good2Go assessment and data handling.',
};

export default function ConsentPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Client Consent</h1>
      <p className="text-gray-600 mt-2">
        Please review the consent information below. You can acknowledge this during booking.
      </p>

      <Section>
        <h2 className="text-xl font-semibold">Purpose</h2>
        <p className="mt-2 text-gray-700">
          The Good2Go assessment provides indicators related to recovery and readiness following concussion or similar conditions.
          It does not diagnose medical conditions and is not a substitute for a clinical evaluation.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold">Procedure</h2>
        <p className="mt-2 text-gray-700">
          You will complete a short walking test with a cognitive task. Motion data will be recorded from a smartphone sensor and processed to produce metrics.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold">Risks & Discomforts</h2>
        <p className="mt-2 text-gray-700">
          Walking is a low‑risk activity. If you feel unwell, dizzy, or unstable, stop immediately and tell the assessor.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold">Privacy & Data</h2>
        <p className="mt-2 text-gray-700">
          Your data is stored securely. You may request access or deletion at any time by contacting <a className="underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
        </p>
      </Section>

      <Section>
        <h2 className="text-xl font-semibold">Voluntary Participation</h2>
        <p className="mt-2 text-gray-700">
          Participation is voluntary. You may withdraw at any time before your results are issued.
        </p>
      </Section>

      <div className="mt-8 flex gap-3">
        <Link className="px-5 py-3 rounded-xl border" href="/booking">Proceed to Booking</Link>
        <Link className="px-5 py-3 rounded-xl border" href="/">Back to Home</Link>
      </div>
    </main>
  );
}

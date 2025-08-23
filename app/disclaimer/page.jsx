import Link from 'next/link';

export const metadata = {
  title: 'Disclaimer — Good2Go',
  description: 'Important information about the limitations of the Good2Go assessment.',
};

export default function DisclaimerPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Disclaimer</h1>
      <p className="mt-4 text-gray-700">
        The Good2Go assessment provides non‑diagnostic indicators to help inform return‑to‑health decisions.
        It is not a medical service and does not replace consultation with a qualified clinician.
        Always seek professional medical advice if you have concerns about your health.
      </p>
      <ul className="list-disc ml-6 mt-6 text-gray-700 space-y-2">
        <li>Results are influenced by test conditions and client effort.</li>
        <li>Underlying medical issues may require separate clinical assessment.</li>
        <li>Good2Go is not liable for decisions made solely on the basis of these results.</li>
      </ul>
      <div className="mt-8">
        <Link className="px-5 py-3 rounded-xl border" href="/">Back to Home</Link>
      </div>
    </main>
  );
}

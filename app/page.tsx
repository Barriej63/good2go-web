import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">Good2Go Concussion Assessments</h1>
      <p className="text-lg text-slate-600 mb-8">
        Baseline and post-concussion testing. 
        Simple online booking form.
      </p>

      {/* Buttons underneath the text */}
      <div className="flex justify-center gap-4">
        <Link href="/book" className="btn btn-primary">
          Book a Test
        </Link>
        <Link href="/admin/login" className="btn btn-ghost">
          Clinician/Admin Login
        </Link>
      </div>
    </main>
  );
}

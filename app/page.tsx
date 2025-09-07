export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Good2Go Concussion Assessments</h1>
      <p className="text-slate-600 mt-2 max-w-2xl">
        Baseline and post-concussion monitoring led by clinicians. Simple online booking and secure results sharing.
      </p>
      <div className="mt-8 flex gap-4">
        <a href="/book" className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 shadow-sm">Book a Test</a>
        <a href="/admin/login" className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3">
          Clinician/Admin Login
        </a>
      </div>
    </main>
  );
}

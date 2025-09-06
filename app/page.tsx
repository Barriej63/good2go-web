import Link from 'next/link';

export default function Page() {
  return (
    <main className="container hero">
      <h1>Good2Go — Concussion Monitoring</h1>
      <p className="lead">
        Book a Good2Go concussion baseline or post-incident gait assessment.
        Secure payments supported (Worldline / Paymark Click HPP).
      </p>

      <ul className="bullets">
        <li>Standard 1-minute dual-task gait test</li>
        <li>Multiple regional clinics</li>
      </ul>

      <div className="btn-row">
        <Link href="/book" className="btn btn-primary">Book a Session</Link>
        <Link href="/admin/login" className="btn btn-ghost">Admin</Link>
      </div>
    </main>
  );
}

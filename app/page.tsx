import Link from 'next/link';

export default function Page() {
  return (
    <section>
      <h2>About the Service</h2>
      <p>Book a Good2Go concussion baseline or post-incident gait assessment. Secure payments supported (Worldline / Paymark Click HPP).</p>
      <ul>
        <li>Standard 1-minute dual-task gait test</li>
        <li>Multiple regional clinics</li>
      </ul>

      <p><Link href="/book">Go to Booking →</Link></p>

      {/* Admin entry (login page) */}
      <p><Link href="/admin/login">Admin →</Link></p>
    </section>
  );
}


// app/page.tsx (booking project landing)
import Link from 'next/link';

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Good2Go — Concussion Monitoring</h1>
      <p><Link href="/book">Go to Booking →</Link></p>
      <p><Link href="/admin/login">Admin →</Link></p>{/* login first */}
    </main>
  );
}

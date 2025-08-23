import RegionCards from '@/components/RegionCards';

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-bold leading-tight">Good2Go Concussion Assessment</h1>
        <p className="mt-3 text-gray-700 max-w-2xl">
          Book an evidence-based assessment with follow-up monitoring. Secure booking and payment online.
        </p>
        <div className="mt-6 flex gap-3">
          <a href="/booking" className="px-5 py-3 rounded-xl bg-black text-white">Book a Good2Go Assessment</a>
          <a href="/faq" className="px-5 py-3 rounded-xl border">Learn more</a>
        </div>
      </section>

      <RegionCards />

      <section id="how" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold mb-4">How it works</h2>
        <ol className="list-decimal ml-6 space-y-2 text-gray-700">
          <li>Select your region and preferred time slot.</li>
          <li>Complete payment to confirm your booking.</li>
          <li>Receive confirmation email with details and calendar invite.</li>
        </ol>
      </section>
    </div>
  );
}

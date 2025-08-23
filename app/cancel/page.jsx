export default function CancelPage() {
  return (
    <main className="px-6 py-10 max-w-xl">
      <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
      <p className="text-gray-700">
        Your payment was cancelled or did not complete. Your booking has not been confirmed.
      </p>
      <ul className="list-disc ml-6 mt-4 space-y-2 text-gray-700">
        <li>Return to the booking page to try again.</li>
        <li>If a charge appears on your statement but you didn\'t receive a confirmation email, please contact support.</li>
      </ul>
      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl border" href="/booking">Back to booking</a>
        <a className="px-4 py-2 rounded-xl border" href="/">Home</a>
      </div>
    </main>
  );
}

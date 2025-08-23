
// app/success/page.tsx
// Server component version (no client hooks). Avoids Suspense/revalidate issues.
export const dynamic = "force-dynamic";

export default function SuccessPage({
  searchParams,
}: {
  searchParams?: { bid?: string };
}) {
  const bid = searchParams?.bid ?? null;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-6">
      <h1 className="text-3xl font-bold text-green-600 mb-4">✅ Booking Successful</h1>
      <p className="text-lg mb-2">Thank you! Your booking has been confirmed.</p>
      {bid && (
        <p className="text-gray-600 mb-4">
          Booking reference: <span className="font-mono">{bid}</span>
        </p>
      )}
      <p className="text-gray-700">
        A confirmation email has been sent to you with the booking details.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
      >
        Return to Home
      </a>
    </main>
  );
}

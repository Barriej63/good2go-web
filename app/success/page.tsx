
// app/success/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function SuccessInner() {
  const params = useSearchParams();
  const bid = params.get("bid");

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

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <h1 className="text-2xl font-semibold mb-2">Loading…</h1>
          <p>Please wait while we prepare your confirmation.</p>
        </main>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}

// app/pay/redirect/page.jsx
import { Suspense } from 'react';
import RedirectClient from './redirect-client';

// This page depends on runtime query params (?ref, ?amount)
// so do not pre-render.
export const dynamic = 'force-dynamic';

export default function PayRedirectPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-lg">
          Preparing your payment… (do not close this window)
        </main>
      }
    >
      <RedirectClient />
    </Suspense>
  );
}

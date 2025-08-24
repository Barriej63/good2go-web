
export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import RedirectClient from './redirect-client';

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:'2rem'}}>Preparing payment…</div>}>
      <RedirectClient />
    </Suspense>
  );
}

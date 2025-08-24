export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Server component wrapper that renders the client redirect logic.
import RedirectClient from './redirect-client';

export default function RedirectPage() {
  return <RedirectClient />;
}

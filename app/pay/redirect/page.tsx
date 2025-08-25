
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default function PayRedirectPage({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const s = searchParams || {};
  const get = (k: string) => {
    const v = s[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const ref = get('ref') || get('Reference') || get('merchantReference') || get('reference');
  if (typeof ref === 'string' && ref.trim().length) {
    redirect(`/success?ref=${encodeURIComponent(ref.trim())}`);
  }
  redirect('/');
}

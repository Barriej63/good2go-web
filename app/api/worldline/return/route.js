
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

function redirectTo(to) {
  return NextResponse.redirect(to, 302);
}

async function extractRef(req) {
  try {
    const url = new URL(req.url);
    const qRef = url.searchParams.get('ref');
    if (qRef) return qRef;
    const form = await req.formData().catch(() => null);
    if (form) {
      return form.get('merchant_reference') || form.get('reference') || form.get('ref') || '';
    }
  } catch {}
  return '';
}

export async function GET(req) {
  const ref = await extractRef(req);
  const to = '/success' + (ref ? ('?ref=' + encodeURIComponent(ref)) : '');
  return redirectTo(to);
}

export async function POST(req) {
  const ref = await extractRef(req);
  // In a real integration you might validate signature/status here.
  const to = '/success' + (ref ? ('?ref=' + encodeURIComponent(ref)) : '');
  return redirectTo(to);
}

// app/api/hpp/start/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Minimal redirector.
 * Reads ?ref=, optionally logs/debugs, and 302 redirects to WORLDLINE_HPP_URL (if set)
 * or falls back to /success?ref=...
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    if (!ref) {
      return NextResponse.json({ error: 'missing ref' }, { status: 400 });
    }

    // TODO: if you want to call Worldline "init" here, do it and set hppUrl to the response
    const conf = process.env.WORLDLINE_HPP_URL; // e.g., https://secure.paymarkclick.co.nz/hpp/...
    const dest = conf
      ? (conf.includes('?') ? `${conf}&ref=${encodeURIComponent(ref)}` : `${conf}?ref=${encodeURIComponent(ref)}`)
      : `/success?ref=${encodeURIComponent(ref)}`;

    return NextResponse.redirect(dest, { status: 302 });
  } catch (e) {
    console.error('GET /api/hpp/start error:', e);
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 });
  }
}

// Optional: health check so you can hit /api/hpp/start?ref=TEST in the browser
export async function POST(req) {
  try {
    const body = await req.json().catch(()=> ({}));
    return NextResponse.json({ ok: true, note: 'POST not required; use GET with ?ref=...' });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

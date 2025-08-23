import { NextResponse } from 'next/server';

/**
 * HPP redirector with absolute-URL safety and optional init call.
 *
 * Env options:
 * - WORLDLINE_INIT_ENDPOINT: If set, we'll POST to this URL to create a session and expect a JSON body
 *   that contains a redirect link in one of: redirectUrl | paymentUrl | url | hppUrl | webPaymentUrl
 * - WORLDLINE_INIT_METHOD: Defaults to POST
 * - WORLDLINE_INIT_HEADERS: Optional JSON of headers to send (e.g. '{"Content-Type":"application/json","Authorization":"Bearer XXX"}')
 * - WORLDLINE_INIT_BODY_TEMPLATE: Optional JSON template string; supports {ref} token replacement. Example:
 *     '{"reference":"{ref}","amount":19900,"currency":"NZD"}'
 * - WORLDLINE_HPP_URL: If provided and absolute (http/https), we will append ?ref=... and redirect there.
 *   If it's a relative path (starts with '/'), we will convert it to an absolute URL using the current request origin.
 *
 * Fallback: if nothing else is configured, we 302 to the absolute /success?ref=... page so the flow continues.
 */

export const dynamic = 'force-dynamic';

function absolutify(urlOrPath, reqUrl) {
  try {
    // Absolute already?
    const u = new URL(urlOrPath);
    return u.toString();
  } catch (_e) {
    // Relative -> resolve against the current origin
    const origin = new URL(reqUrl).origin;
    return new URL(urlOrPath, origin).toString();
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  if (!ref) {
    return NextResponse.json({ error: 'missing ref' }, { status: 400 });
  }

  // 1) If INIT endpoint is configured, try to create session and use returned URL
  const initUrl = process.env.WORLDLINE_INIT_ENDPOINT;
  if (initUrl) {
    try {
      const method = (process.env.WORLDLINE_INIT_METHOD || 'POST').toUpperCase();
      const headers = process.env.WORLDLINE_INIT_HEADERS ? JSON.parse(process.env.WORLDLINE_INIT_HEADERS) : {};
      let body = undefined;
      if (process.env.WORLDLINE_INIT_BODY_TEMPLATE) {
        const template = process.env.WORLDLINE_INIT_BODY_TEMPLATE;
        const replaced = template.replaceAll('{ref}', ref);
        body = replaced;
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      }
      const resp = await fetch(initUrl, { method, headers, body });
      const txt = await resp.text();
      let json;
      try { json = JSON.parse(txt); } catch (_e) { json = null; }

      const link = json?.redirectUrl || json?.paymentUrl || json?.url || json?.hppUrl || json?.webPaymentUrl;
      if (link) {
        const absoluteLink = absolutify(link, req.url);
        return NextResponse.redirect(absoluteLink, { status: 302 });
      }

      // If INIT endpoint returned a Location header (some gateways do that)
      const loc = resp.headers.get('location');
      if (loc) {
        return NextResponse.redirect(absolutify(loc, req.url), { status: 302 });
      }

      // If it returned HTML, last resort: just return it (not ideal)
      if (resp.ok && txt && txt.startsWith('<!DOCTYPE')) {
        return new Response(txt, { status: resp.status, headers: { 'Content-Type': 'text/html' } });
      }

      // Fall through to configured HPP URL
      console.warn('INIT endpoint returned no link; falling back. Body:', txt);
    } catch (e) {
      console.error('INIT call failed:', e);
      // continue to fallback
    }
  }

  // 2) Direct HPP URL mode
  const direct = process.env.WORLDLINE_HPP_URL;
  if (direct) {
    const withRef = direct.includes('?') ? `${direct}&ref=${encodeURIComponent(ref)}` : `${direct}?ref=${encodeURIComponent(ref)}`;
    const absolute = absolutify(withRef, req.url);
    return NextResponse.redirect(absolute, { status: 302 });
  }

  // 3) Final fallback: /success?ref=... (absolute)
  const successAbs = absolutify(`/success?ref=${encodeURIComponent(ref)}`, req.url);
  return NextResponse.redirect(successAbs, { status: 302 });
}

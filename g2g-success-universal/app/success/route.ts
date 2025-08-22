// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Universal Success Route
 * Returns a minimal HTML success page for ANY method (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS).
 * This guarantees no 405 even if a gateway POSTs directly to /success.
 * If you also have app/success/page.tsx, that's fine—this route will serve instead.
 */

function renderHtml(url: URL) {
  const bid = url.searchParams.get("bid") || url.searchParams.get("bookingId") || "";
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Payment successful</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:2rem;background:#f7fafc;color:#111}
      .card{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:24px}
      h1{margin:0 0 8px;font-size:22px}
      .muted{color:#666;margin:0 0 16px}
      code{background:#f1f5f9;padding:2px 6px;border-radius:6px}
      a.button{display:inline-block;margin-top:8px;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;text-decoration:none;color:#111}
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Payment successful 🎉</h1>
      <p class="muted">Thank you—your booking has been confirmed.</p>
      ${bid ? `<p>Your reference: <code>${bid}</code></p>` : ""}
      <a class="button" href="/">Back to home</a>
      <script>
        // Ensure future reloads use GET (if we arrived here via POST)
        try { if (history && history.replaceState) history.replaceState(null, "", window.location.href); } catch {}
      </script>
    </main>
  </body>
</html>`;
  return body;
}

function respond(req: NextRequest) {
  const url = new URL(req.url);
  return new NextResponse(renderHtml(url), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const GET = respond;
export const POST = respond;
export const PUT = respond;
export const PATCH = respond;
export const DELETE = respond;
export const HEAD = respond;
export const OPTIONS = respond;

// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles non-GET requests to /success.
 * Returns a small HTML page and client-redirects to the same URL as a GET.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const safeUrl = url.pathname + url.search; // relative path for client redirect

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0;url=${safeUrl}">
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>…</p>
  <script>
    (function () {
      try {
        var safeUrl = ${JSON.stringify(safeUrl)};
        window.location.replace(safeUrl);
      } catch (e) {}
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function HEAD(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
export async function OPTIONS(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }

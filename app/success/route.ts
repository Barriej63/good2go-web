// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles gateways that POST to /success.
 * Returns a minimal HTML success page (so no 405), and performs a client redirect to GET.
 * Your existing app/success/page.tsx will render on the follow-up GET.
 */
async function extractBid(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("bid") || url.searchParams.get("bookingId") || url.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      const p = new URLSearchParams(body);
      return p.get("bid") || p.get("bookingId") || p.get("id");
    }
    if (ct.includes("application/json")) {
      const j: any = await req.json().catch(() => ({}));
      return j?.bid || j?.bookingId || j?.id || null;
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const bid = await extractBid(req);

  const safeUrl = url.toString(); // same URL (client redirect will GET it)
  const safeBid = bid ? String(bid) : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="x-ua-compatible" content="ie=edge"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Payment successful</title>
  <!-- Try to convert this POST into a GET render of the same URL -->
  <meta http-equiv="refresh" content="0;url='${safeUrl.replace("'","%27")}'"/>
  <script>
    (function(){
      try {
        // Replace the current history entry so the next load is a GET
        window.location.replace(${json.dumps(safeUrl)});
      } catch (e) {}
    })();
  </script>
  <style>
    body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif; margin:2rem;}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
    .card{max-width:640px;border:1px solid #e5e7eb;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
  </style>
</head>
<body>
  <div class="card">
    <h1>Payment successful 🎉</h1>
    ${safeBid ? `<p>Your booking reference: <span class="mono">${safeBid}</span></p>` : ``}
    <p>Loading confirmation… If this page doesn’t refresh automatically, <a href="${safeUrl}">click here</a>.</p>
  </div>
  <noscript>
    <p>JavaScript is disabled; please <a href="${safeUrl}">continue</a>.</p>
  </noscript>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

// Optional niceties to keep logs clean
export async function HEAD(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
export async function OPTIONS(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }

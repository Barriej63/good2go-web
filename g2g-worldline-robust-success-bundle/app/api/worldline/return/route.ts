// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Robust return:
 * - Accepts JSON, form, or query string
 * - Marks booking paid
 * - Stores diagnostics (method, headers, raw first 4k)
 * - Returns a minimal HTML success page (200) so there is NEVER a 405
 */

type Parsed = { bookingId?: string; q?: string; email?: string; name?: string };

async function parseBody(req: NextRequest): Promise<Parsed & { raw?: string; contentType?: string; }> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await req.json().catch(() => ({} as any));
    return {
      bookingId: String(json.bookingId || json.bid || ""),
      q: json.q ? String(json.q) : (json.token ? String(json.token) : undefined),
      email: json.email ? String(json.email) : undefined,
      name: json.name ? String(json.name) : undefined,
      raw: JSON.stringify(json).slice(0, 4000),
      contentType: ct
    };
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    const txt = await req.text();
    const p = new URLSearchParams(txt);
    return {
      bookingId: p.get("bookingId") || p.get("bid") || undefined,
      q: p.get("q") || p.get("token") || undefined,
      email: p.get("email") || undefined,
      name: p.get("name") || undefined,
      raw: txt.slice(0, 4000),
      contentType: ct
    };
  }
  // Other content types
  const txt = await req.text().catch(() => "");
  return { raw: txt.slice(0, 4000), contentType: ct };
}

function parseQuery(req: NextRequest): Parsed {
  const url = new URL(req.url);
  return {
    bookingId: url.searchParams.get("bid") || url.searchParams.get("bookingId") || url.searchParams.get("id") || undefined,
    q: url.searchParams.get("q") || url.searchParams.get("token") || undefined,
    email: url.searchParams.get("email") || undefined,
    name: url.searchParams.get("name") || undefined,
  };
}

async function markPaid(bookingId: string, q: string | undefined, email?: string, name?: string) {
  const db = getAdminDb();
  const ref = db.collection("bookings").doc(bookingId);
  const now = new Date().toISOString();
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() as any) : {};

  await ref.set({
    ...existing,
    paid: true,
    status: "paid",
    paidAt: now,
    worldline: {
      ...(existing?.worldline || {}),
      q: q || existing?.worldline?.q || "",
      env: (process.env.WORLDLINE_ENV || "uat"),
      returnedAt: now,
    },
  }, { merge: true });

  // Optional SendGrid
  const toEmail = email || existing?.email;
  const toName = name || existing?.name;
  if (toEmail && process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
    try {
      const mod: any = await import("@sendgrid/mail");
      const sgMail = mod.default || mod;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
      await sgMail.send({
        to: toName ? { email: String(toEmail), name: String(toName) } : String(toEmail),
        from: process.env.SENDGRID_FROM as string,
        subject: "Good2Go Booking Confirmation",
        text: `Thanks! Your booking (${bookingId}) is confirmed.`,
        html: `<p>Thanks! Your booking <strong>${bookingId}</strong> is confirmed.</p>`,
      });
    } catch {}
  }
}

function htmlSuccess(bid: string | undefined) {
  const ref = bid ? `<p>Your reference: <code>${bid}</code></p>` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    <p class="muted">Thank you — your booking has been confirmed.</p>
    ${ref}
    <a class="button" href="/">Back to home</a>
    <script>
      // Optional: hop to /success?bid=... as a GET after rendering
      try {
        var params = new URLSearchParams(window.location.search);
        var bid = params.get("bid") || ${JSON.stringify("")};
        if (bid) {
          setTimeout(function(){ window.location.replace("/success?bid=" + encodeURIComponent(bid)); }, 600);
        }
      } catch(e){}
    </script>
  </main>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const q = parseQuery(req);
  const db = getAdminDb();
  if (!q.bookingId) {
    return new NextResponse(htmlSuccess(undefined), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  // Store diagnostics (GET)
  await db.collection("bookings").doc(q.bookingId).set({
    worldline: {
      return: {
        at: new Date().toISOString(),
        method: "GET",
        contentType: req.headers.get("content-type") || "",
      }
    }
  }, { merge: true });

  try {
    await markPaid(q.bookingId, q.q, q.email, q.name);
  } catch {}
  return new NextResponse(htmlSuccess(q.bookingId), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req);
  const q = parseQuery(req);
  const bookingId = parsed.bookingId || q.bookingId;
  const token = parsed.q || q.q;
  const email = parsed.email || q.email;
  const name = parsed.name || q.name;

  const db = getAdminDb();
  const headersObj: Record<string,string> = {};
  req.headers.forEach((v,k)=>{ headersObj[k]=v; });

  // Store diagnostics for POST
  await db.collection("bookings").doc(String(bookingId || "unknown")).set({
    worldline: {
      return: {
        at: new Date().toISOString(),
        method: "POST",
        contentType: parsed.contentType || (req.headers.get("content-type") || ""),
        headers: headersObj,
        raw: parsed.raw || "",
      }
    }
  }, { merge: true });

  if (bookingId) {
    try {
      await markPaid(bookingId, token, email, name);
    } catch {}
  }
  return new NextResponse(htmlSuccess(bookingId), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
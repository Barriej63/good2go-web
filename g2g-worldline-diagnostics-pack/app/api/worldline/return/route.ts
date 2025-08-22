// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Return handler that:
 * - Parses JSON, form, or query params.
 * - Marks booking paid.
 * - Stores a trimmed copy of gateway payload for audit under bookings/<id>.worldline.return
 * - Responds with a minimal HTML "Payment successful" page (no redirect -> no 405).
 */

type Parsed = { bookingId?: string; q?: string; email?: string; name?: string };

async function parseBody(req: NextRequest): Promise<{ parsed: Parsed; raw: string; contentType: string | null }> {
  const ct = req.headers.get("content-type");
  let parsed: Parsed = {};
  let raw = "";
  try {
    if (ct && ct.includes("application/json")) {
      const data = await req.json().catch(() => ({} as any));
      parsed = {
        bookingId: String(data.bookingId || data.bid || ""),
        q: data.q ? String(data.q) : (data.token ? String(data.token) : undefined),
        email: data.email ? String(data.email) : undefined,
        name: data.name ? String(data.name) : undefined,
      };
      raw = JSON.stringify(data);
    } else if (ct && ct.includes("application/x-www-form-urlencoded")) {
      raw = await req.text();
      const p = new URLSearchParams(raw);
      parsed = {
        bookingId: p.get("bookingId") || p.get("bid") || undefined,
        q: p.get("q") || p.get("token") || undefined,
        email: p.get("email") || undefined,
        name: p.get("name") || undefined,
      };
    } else {
      raw = await req.text().catch(() => "");
    }
  } catch {}
  return { parsed, raw, contentType: ct || null };
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

async function markPaidAndAudit(bookingId: string, q: string | undefined, audit: any, email?: string, name?: string) {
  const db = getAdminDb();
  const ref = db.collection("bookings").doc(bookingId);
  const now = new Date().toISOString();
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() as any) : {};

  // Limit audit size
  const trimmedRaw = typeof audit?.raw === "string" ? audit.raw.slice(0, 4000) : undefined;
  const headersObj: Record<string,string> = {};
  if (audit?.headers && typeof audit.headers.forEach === "function") {
    audit.headers.forEach((v: string, k: string) => { headersObj[k] = v; });
  }

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
      return: {
        at: now,
        method: audit?.method || "",
        contentType: audit?.contentType || "",
        raw: trimmedRaw,
        headers: headersObj,
      }
    },
  }, { merge: true });

  // Optional SendGrid email
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

function successHtml(bookingId: string | undefined) {
  const ref = bookingId ? `<p>Your reference: <code>${bookingId}</code></p>` : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment successful</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:2rem;background:#f7fafc;color:#111}
.card{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:24px}
h1{margin:0 0 8px;font-size:22px}
.muted{color:#666;margin:0 0 16px}
code{background:#f1f5f9;padding:2px 6px;border-radius:6px}
a.button{display:inline-block;margin-top:8px;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;text-decoration:none;color:#111}
</style></head>
<body><main class="card">
<h1>Payment successful 🎉</h1>
<p class="muted">Thank you—your booking has been confirmed.</p>
${ref}
<a class="button" href="/">Back to home</a>
</main></body></html>`;
}

async function handle(req: NextRequest) {
  const { parsed: bodyParsed, raw, contentType } = await parseBody(req);
  const queryParsed = parseQuery(req);
  const bookingId = bodyParsed.bookingId || queryParsed.bookingId;
  const token = bodyParsed.q || queryParsed.q;
  const email = bodyParsed.email || queryParsed.email;
  const name = bodyParsed.name || queryParsed.name;

  if (!bookingId) {
    // We still return 200 with a generic success page to avoid gateway retries
    return new NextResponse(successHtml(undefined), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  await markPaidAndAudit(bookingId, token, {
    method: req.method,
    contentType: contentType || "",
    raw,
    headers: req.headers,
  }, email, name);

  return new NextResponse(successHtml(bookingId), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;

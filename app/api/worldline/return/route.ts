// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Marks booking as paid, then redirects to /success?bid=... with HTTP 303 (forces GET).
 * Accepts JSON, form-encoded, and query-string.
 */

type Parsed = { bookingId?: string; q?: string; email?: string; name?: string };

async function parseBody(req: NextRequest): Promise<Parsed> {
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({} as any));
      return {
        bookingId: String(body.bookingId || body.bid || ""),
        q: body.q ? String(body.q) : (body.token ? String(body.token) : undefined),
        email: body.email ? String(body.email) : undefined,
        name: body.name ? String(body.name) : undefined,
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
      };
    }
  } catch {}
  return {};
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

function successRedirect(req: NextRequest, bookingId: string) {
  const url = new URL(req.url);
  const dest = new URL("/success", url.origin);
  dest.searchParams.set("bid", bookingId);
  return NextResponse.redirect(dest, 303); // force GET
}

export async function GET(req: NextRequest) {
  const q = parseQuery(req);
  if (!q.bookingId) {
    return NextResponse.json({ ok: false, error: "Missing bookingId (?bid=)" }, { status: 400 });
  }
  try {
    await markPaid(q.bookingId, q.q, q.email, q.name);
    return successRedirect(req, q.bookingId);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const b = await parseBody(req);
  const q = parseQuery(req);
  const bookingId = b.bookingId || q.bookingId;
  const token = b.q || q.q;
  const email = b.email || q.email;
  const name = b.name || q.name;

  if (!bookingId) {
    // 200 to avoid retries; UI can poll
    return NextResponse.json({ ok: false, error: "Missing bookingId" }, { status: 200 });
  }

  try {
    await markPaid(bookingId, token, email, name);
    return successRedirect(req, bookingId);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

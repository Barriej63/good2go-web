// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
// Import your Firebase Admin helper (JS is fine to import in TS)
import { getAdminDb } from "@/lib/firebaseAdmin";

// (Optional) SendGrid confirmation
async function maybeSendEmail(toEmail: string, toName: string | undefined, bookingId: string) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.SENDGRID_FROM;
    if (!apiKey || !from) return;
    const sgMail = await import("@sendgrid/mail");
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: toName ? { email: toEmail, name: toName } : toEmail,
      from,
      subject: "Good2Go Booking Confirmation",
      text: `Thanks! Your booking (${bookingId}) is confirmed.`,
      html: `<p>Thanks! Your booking <strong>${bookingId}</strong> is confirmed.</p>`,
    });
  } catch (_e) {
    // swallow email errors to avoid interrupting success
  }
}

/**
 * Handles the Hosted Payment Page return.
 * Supports both GET (from redirect) and POST (if you choose to post data back).
 *
 * We expect either:
 *  - GET /api/worldline/return?q=<token>&bid=<bookingId>
 *  - or GET /success?q=<token>&bid=<bookingId> (if you mapped PUBLIC_RETURN_URL there)
 *  - or POST with JSON { bookingId, q }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || url.searchParams.get("token") || "";
  const bookingId = url.searchParams.get("bid") || url.searchParams.get("bookingId") || url.searchParams.get("id") || "";

  if (!bookingId) {
    // If bookingId isn't in the URL, fail gracefully and instruct client to call POST with JSON body
    return NextResponse.json({ ok:false, error: "Missing bookingId (use ?bid= or POST JSON body)" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection("bookings").doc(bookingId);
    const now = new Date().toISOString();

    // Try to pull current record for email/name
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() as any : {};

    await ref.set({
      ...existing,
      paid: true,
      status: "paid",
      paidAt: now,
      worldline: {
        ...(existing?.worldline || {}),
        q,
        env: (process.env.WORLDLINE_ENV || "uat"),
        returnedAt: now,
      },
    }, { merge: true });

    // Optional email
    const email = existing?.email || url.searchParams.get("email") || "";
    const name = existing?.name || url.searchParams.get("name") || "";

    if (email) {
      await maybeSendEmail(String(email), name ? String(name) : undefined, bookingId);
    }

    return NextResponse.redirect(new URL(`/success?bid=${encodeURIComponent(bookingId)}`, url.origin));
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bookingId, q, email, name } = body || {};
    if (!bookingId) {
      return NextResponse.json({ ok:false, error: "Missing bookingId in body" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("bookings").doc(String(bookingId));
    const now = new Date().toISOString();
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() as any : {};

    await ref.set({
      ...existing,
      paid: true,
      status: "paid",
      paidAt: now,
      worldline: {
        ...(existing?.worldline || {}),
        q: q ? String(q) : (existing?.worldline?.q || ""),
        env: (process.env.WORLDLINE_ENV || "uat"),
        returnedAt: now,
      },
    }, { merge: true });

    const finalEmail = (email || existing?.email) ? String(email || existing?.email) : "";
    const finalName = (name || existing?.name) ? String(name || existing?.name) : undefined;
    if (finalEmail) {
      await maybeSendEmail(finalEmail, finalName, String(bookingId));
    }

    return NextResponse.json({ ok:true, bookingId: String(bookingId) });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

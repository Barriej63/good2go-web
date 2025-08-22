// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

// SendGrid helper with safe ESM import
async function sendEmailIfConfigured(toEmail: string, toName: string | undefined, bookingId: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM;
  if (!apiKey || !from || !toEmail) return;

  // In Next.js/TypeScript, dynamic import of @sendgrid/mail returns { default: MailService }
  const mod = await import("@sendgrid/mail");
  const sgMail = (mod as any).default || mod; // support both typings
  if (typeof sgMail.setApiKey === "function") {
    sgMail.setApiKey(apiKey);
  } else if (sgMail.MailService && typeof sgMail.MailService.prototype.setApiKey === "function") {
    // extremely defensive; shouldn't be needed
    const svc = new sgMail.MailService();
    svc.setApiKey(apiKey);
    return svc.send({
      to: toName ? { email: toEmail, name: toName } : toEmail,
      from,
      subject: "Good2Go Booking Confirmation",
      text: `Thanks! Your booking (${bookingId}) is confirmed.`,
      html: `<p>Thanks! Your booking <strong>${bookingId}</strong> is confirmed.</p>`,
    });
  }

  await sgMail.send({
    to: toName ? { email: toEmail, name: toName } : toEmail,
    from,
    subject: "Good2Go Booking Confirmation",
    text: `Thanks! Your booking (${bookingId}) is confirmed.`,
    html: `<p>Thanks! Your booking <strong>${bookingId}</strong> is confirmed.</p>`,
  });
}

/**
 * Handles the Hosted Payment Page return.
 * GET /api/worldline/return?q=<token>&bid=<bookingId>
 * or POST with { bookingId, q, email?, name? }
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || url.searchParams.get("token") || "";
  const bookingId = url.searchParams.get("bid") || url.searchParams.get("bookingId") || url.searchParams.get("id") || "";

  if (!bookingId) {
    return NextResponse.json({ ok:false, error: "Missing bookingId (use ?bid= or POST JSON body)" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection("bookings").doc(String(bookingId));
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
        q,
        env: (process.env.WORLDLINE_ENV || "uat"),
        returnedAt: now,
      },
    }, { merge: true });

    const email = (existing?.email || url.searchParams.get("email") || "") as string;
    const name = (existing?.name || url.searchParams.get("name") || "") as string;
    if (email) await sendEmailIfConfigured(email, name || undefined, String(bookingId));

    return NextResponse.redirect(new URL(`/success?bid=${encodeURIComponent(String(bookingId))}`, url.origin));
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const bookingId = String(body?.bookingId || "");
    if (!bookingId) {
      return NextResponse.json({ ok:false, error: "Missing bookingId in body" }, { status: 400 });
    }
    const q = String(body?.q || "");
    const email = body?.email ? String(body.email) : "";
    const name = body?.name ? String(body.name) : undefined;

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

    if (email) await sendEmailIfConfigured(email, name, bookingId);

    return NextResponse.json({ ok:true, bookingId });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Failed to update booking" }, { status: 500 });
  }
}

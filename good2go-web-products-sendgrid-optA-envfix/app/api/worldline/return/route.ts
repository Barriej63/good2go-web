import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { adminDb } from "@/src/firebaseAdmin";
import { sendEmail } from "@/src/email";

export const dynamic = "force-dynamic";

function normalizeEnv(val?: string) {
  const s = (val || '').toLowerCase().trim();
  if (['prod', 'production', 'live'].includes(s)) return 'prod';
  if (['uat', 'test', 'testing', 'sandbox', 'staging', 'dev', 'development'].includes(s)) return 'uat';
  return 'uat';
}


function getPaymarkAuth() {
  const username = process.env.WORLDLINE_USERNAME || process.env.PAYMARK_CLIENT_ID;
  const password = process.env.WORLDLINE_PASSWORD || process.env.PAYMARK_API_KEY;
  const rawEnv = process.env.WORLDLINE_ENV || process.env.PAYMARK_ENV || "uat";
  const env = normalizeEnv(rawEnv);
  return { username, password, env };
}

async function verifyTransaction(transactionId: string) {
  const { username, password, env } = getPaymarkAuth();
  const base = env === "prod"
    ? "https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest"
    : "https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest";
  const url = `${base}/?cmd=_xclick&transaction_id=${encodeURIComponent(transactionId)}`;
  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const res = await axios.get(url, { headers: { "Authorization": `Basic ${auth}` } });
  const text: string = typeof res.data === "string" ? res.data : String(res.data);
  return text;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const TransactionId = String(form.get("TransactionId") || "");
  const Reference = String(form.get("Reference") || "");
  const Particular = String(form.get("Particular") || "");

  if (!TransactionId) return NextResponse.json({ error: "Missing TransactionId" }, { status: 400 });

  const verification = await verifyTransaction(TransactionId);
  const ok = /<status>1<\/status>|Status>1</i.test(verification) || /SUCCESS/i.test(verification);

  let bookingId: string | null = null;
  try {
    const p = JSON.parse(Particular);
    bookingId = p.bookingId || null;
  } catch {}

  if (bookingId) {
    const ref = adminDb.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    const booking = snap.exists ? snap.data() as any : null;

    if (ok && booking) {
      await ref.update({ status: "paid", transactionId: TransactionId, reference: Reference });
      if (booking.email) {
        const amount = (Number(booking.amount || 0)/100).toFixed(2);
        const productName = booking.product?.name || "Good2Go Booking";
        await sendEmail(
          booking.email,
          "Good2Go booking confirmed",
          `<p>Thanks ${booking.name ? booking.name : ""}! Your payment has been received.</p>
           <p><b>Product:</b> ${productName}<br/>
              <b>Amount:</b> $${amount}<br/>
              <b>Transaction:</b> ${TransactionId}<br/>
              <b>Reference:</b> ${Reference}</p>
           <p>See you soon.<br/>— Good2Go</p>`
        );
      }
      return NextResponse.redirect(new URL("/success", req.url));
    } else {
      await ref.update({ status: "cancelled" });
      return NextResponse.redirect(new URL("/cancel", req.url));
    }
  } else {
    return NextResponse.redirect(new URL("/cancel", req.url));
  }
}

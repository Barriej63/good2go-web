import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import { adminDb } from "@/src/firebaseAdmin";

const schema = z.object({
  productId: z.string(),
  region: z.string(),
  slot: z.object({
    weekday: z.string(),
    start: z.string(),
    end: z.string(),
    venueAddress: z.string().optional(),
    note: z.string().optional()
  }),
  name: z.string(),
  email: z.string().email(),
});

function normalizeEnv(val?: string) {
  const s = (val || '').toLowerCase().trim();
  if (['prod', 'production', 'live'].includes(s)) return 'prod';
  if (['uat', 'test', 'testing', 'sandbox', 'staging', 'dev', 'development'].includes(s)) return 'uat';
  return 'uat';
}


function getPaymarkConfig() {
  const username = process.env.WORLDLINE_USERNAME || process.env.PAYMARK_CLIENT_ID;
  const password = process.env.WORLDLINE_PASSWORD || process.env.PAYMARK_API_KEY;
  const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.PAYMARK_ACCOUNT_ID;
  const rawEnv = process.env.WORLDLINE_ENV || process.env.PAYMARK_ENV || "uat";
  const env = normalizeEnv(rawEnv);
  const referencePrefix = process.env.BOOKING_REF_PREFIX || process.env.G2G_REFERENCE_PREFIX || "G2G";
  const returnUrlEnv = process.env.WORLDLINE_RETURN_URL;
  return { username, password, accountId, env, referencePrefix, returnUrlEnv };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { username, password, accountId, env, referencePrefix, returnUrlEnv } = getPaymarkConfig();
  if (!username || !password || !accountId) {
    return NextResponse.json({ error: "Worldline/Paymark env not fully configured." }, { status: 500 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const returnUrl = (returnUrlEnv && returnUrlEnv.length > 0) ? returnUrlEnv : `${origin}/api/worldline/return`;

  const prodSnap = await adminDb.collection("products").doc(parsed.data.productId).get();
  if (!prodSnap.exists) return NextResponse.json({ error: "Product not found." }, { status: 400 });
  const prod = prodSnap.data() as any;
  if (!prod.active) return NextResponse.json({ error: "Product is inactive." }, { status: 400 });
  const priceCents = Number(prod.priceCents || 0);
  if (!priceCents || priceCents <= 0) return NextResponse.json({ error: "Invalid product price." }, { status: 400 });

  const pendingRef = await adminDb.collection("bookings").add({
    region: parsed.data.region,
    slot: parsed.data.slot,
    name: parsed.data.name,
    email: parsed.data.email,
    product: { id: parsed.data.productId, name: prod.name },
    amount: priceCents,
    status: "pending",
    createdAt: new Date(),
  });

  const endpoint = env === "prod"
    ? "https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest"
    : "https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest";

  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  form.set("account_id", accountId);
  form.set("cmd", "_xclick");
  form.set("amount", (priceCents/100).toFixed(2));
  form.set("type", "purchase");
  form.set("reference", `${referencePrefix}-${pendingRef.id.slice(-8)}`);
  form.set("particular", JSON.stringify({ bookingId: pendingRef.id, productId: parsed.data.productId }));
  form.set("return_url", returnUrl);

  try {
    const res = await axios.post(endpoint, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml" },
      timeout: 120000,
    });
    const text: string = typeof res.data === "string" ? res.data : String(res.data);
    const match = text.match(/https?:[^<\s]+/i);
    if (!match) throw new Error("Failed to parse Hosted Payment Page URL");
    const redirectUrl = match[0];
    return NextResponse.json({ redirectUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Worldline request failed" }, { status: 500 });
  }
}

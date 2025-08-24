
// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

function resolveBase(req: NextRequest) {
  const env = (process.env.WORLDLINE_ENV || "").toLowerCase();
  const override = process.env.WORLDLINE_API_BASE;
  const base =
    override ||
    (env && ["prod","production","live"].includes(env)
      ? "https://secure.paymarkclick.co.nz"
      : "https://uat.paymarkclick.co.nz");
  const origin = new URL(req.url).origin;
  return { base, origin, envMode: override ? "custom" : (env && ["prod","production","live"].includes(env) ? "production" : "uat") };
}

function abs(origin: string, pathOrUrl: string) {
  try {
    return new URL(pathOrUrl, origin).toString();
  } catch {
    return origin + pathOrUrl;
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const { base, origin, envMode } = resolveBase(req);
    const creds = {
      username: process.env.WORLDPAY_USERNAME || "",
      password: process.env.WORLDPAY_PASSWORD || "",
      accountId: process.env.WORLDPAY_ACCOUNT_ID || ""
    };
    if (!creds.username || !creds.password || !creds.accountId) {
      return NextResponse.json({ ok:false, error:"Missing WORLDPAY_* env vars" }, { status: 500 });
    }

    const body = await req.json().catch(()=> ({} as any));
    const {
      bookingId,
      amountCents,
      currency = "NZD",
      reference,
      successUrl,
      cancelUrl,
      errorUrl
    } = body || {};

    if (!bookingId || !amountCents) {
      return NextResponse.json({ ok:false, error:"bookingId and amountCents required" }, { status: 400 });
    }

    const successAbs = abs(origin, successUrl || `/api/worldline/return?bid=${encodeURIComponent(bookingId)}`);
    const cancelAbs  = abs(origin, cancelUrl  || `/api/worldline/return?bid=${encodeURIComponent(bookingId)}&cancel=1`);
    const errorAbs   = abs(origin, errorUrl   || `/api/worldline/return?bid=${encodeURIComponent(bookingId)}&error=1`);

    const endpoint = `${base}/api/payment`;

    const payload = {
      amount: { total: Number(amountCents), currency },
      merchant: { merchantId: creds.accountId },
      transaction: { reference: reference || bookingId },
      urls: { success: successAbs, cancel: cancelAbs, error: errorAbs }
    };

    const auth = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");

    const wpRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    });

    const rawText = await wpRes.text();
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch {}

    // Try extract redirect link
    const linkCandidates = [
      parsed?.redirectUrl,
      parsed?.paymentUrl,
      parsed?.url,
      parsed?.hppUrl,
      parsed?.webPaymentUrl,
      parsed?._links?.redirect?.href,
      parsed?._links?.payment?.href
    ];
    const redirectUrl = linkCandidates.find(Boolean);

    await db.collection("bookings").doc(String(bookingId)).set({
      worldline: {
        create: {
          at: new Date().toISOString(),
          endpoint,
          envMode,
          status: wpRes.status,
          body: payload,
          responseRaw: rawText.slice(0,4000),
          redirectUrl: redirectUrl || null
        }
      }
    }, { merge: true });

    if (!wpRes.ok) {
      return NextResponse.json({ ok:false, error:"worldline_init_failed", status: wpRes.status, response: parsed || rawText }, { status: 502 });
    }

    if (!redirectUrl) {
      return NextResponse.json({ ok:false, error:"hpp_link_missing", response: parsed || rawText }, { status: 502 });
    }

    return NextResponse.json({ ok:true, redirectUrl, envMode, bookingId });
  } catch (err:any) {
    return NextResponse.json({ ok:false, error: err?.message || "server_error" }, { status: 500 });
  }
}

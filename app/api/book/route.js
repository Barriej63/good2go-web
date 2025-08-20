import { NextResponse } from "next/server";
import { adminDb } from '../../../lib/firebaseAdmin';

function genRef(prefix="G2G") {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // very light validation
    const required = ["name","email","region","slot","venue","referringName","consentAccepted"];
    for (const k of required) if (!body[k]) {
      return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
    }
    if (body.consentAccepted !== true) {
      return NextResponse.json({ error: "Consent is required" }, { status: 400 });
    }

    const bookingRef = genRef(process.env.NEXT_PUBLIC_BOOKING_REF_PREFIX || "G2G");

    const payload = {
      clientName: body.name,
      email: body.email,
      phone: body.phone || "",
      region: body.region,
      time: body.slot,
      venue: body.venue,
      referringProfessional: { name: body.referringName },
      consent: {
        accepted: true,
        acceptedAt: new Date(),
        duration: body.consentDuration || "Until Revoked",
      },
      bookingRef,
      createdAt: new Date(),
    };

    const doc = await adminDb.collection("bookings").add(payload);
    return NextResponse.json({ ok: true, id: doc.id, bookingRef });
  } catch (e) {
    console.error("book POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

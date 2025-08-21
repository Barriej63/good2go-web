export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/src/firebaseAdmin";

export async function GET() {
  try {
    const snap = await adminDb.collection("products").get();
    const list = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(p => p.active === true)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return NextResponse.json({ ok: true, products: list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to load products" }, { status: 500 });
  }
}

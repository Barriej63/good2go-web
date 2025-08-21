export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchSlotsForRegion } from "../helper";

export async function GET(_req: NextRequest, { params }: { params: { region: string } }) {
  try {
    const region = decodeURIComponent(params.region);
    const slots = await fetchSlotsForRegion(region);
    return NextResponse.json({ ok: true, slots });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to load timeslots" }, { status: 500 });
  }
}

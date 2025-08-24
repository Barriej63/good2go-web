import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Worldline will POST results here when "Post to Return URL" is enabled
export async function POST(req: Request) {
  try {
    const ctype = req.headers.get('content-type') || '';
    let payload: any = {};
    if (ctype.includes('application/json')) {
      payload = await req.json().catch(() => ({}));
    } else if (ctype.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData();
      payload = Object.fromEntries(fd.entries());
    } else {
      const txt = await req.text();
      payload = { raw: txt };
    }
    // TODO: mark booking as paid using payload.merchantReference etc.
    return NextResponse.json({ ok: true, received: payload });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status: 500 });
  }
}

// Allow GET for quick diagnostics
export async function GET() {
  return NextResponse.json({ ok:true, hint:'POST form data from Worldline is expected here.' });
}

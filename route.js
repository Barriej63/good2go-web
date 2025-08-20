export async function GET() {
  return Response.json({ ok: true, env: process.env.NODE_ENV || "unknown" })
}
export async function GET() {
  return new Response(JSON.stringify({ ok: true, env: "staging" }), {
    headers: { "content-type": "application/json" }
  });
}

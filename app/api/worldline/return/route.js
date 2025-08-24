export const dynamic = 'force-dynamic';

export async function GET(req) {
  const q = Object.fromEntries(new URL(req.url).searchParams.entries());
  return new Response(JSON.stringify({ ok: true, route: '/api/worldline/create', query: q }), {
    headers: { 'content-type': 'application/json' }
  });
}

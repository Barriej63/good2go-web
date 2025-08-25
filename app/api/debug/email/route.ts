import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

async function sendViaSendGrid(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const from = process.env.SENDGRID_FROM || '';
  if (!apiKey || !from) return { ok:false, skipped:true, reason:'missing_sendgrid_env' };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.match(/<(.+)>/)?.[1] || from, name: from.replace(/<.*>/,'').trim() },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status };
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const to = u.searchParams.get('to') || process.env.BOOKING_NOTIFY_TO || '';
  if (!to) return NextResponse.json({ ok:false, error:'no_to' }, { status: 400 });
  const r = await sendViaSendGrid(to, 'Test from Good2Go', '<strong>Hello from Good2Go</strong>');
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}

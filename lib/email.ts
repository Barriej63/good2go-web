// /lib/email.ts
type SendArgs = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

const FROM_DEFAULT = process.env.EMAIL_FROM || 'Good2Go <noreply@good2go.example>';

export async function sendEmail({ to, subject, html, from = FROM_DEFAULT }: SendArgs) {
  if (process.env.SENDGRID_API_KEY) {
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: (from.match(/<(.*)>/)?.[1]) || from },
        personalizations: [{ to: [{ email: to }], subject }],
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!r.ok) throw new Error(`SendGrid failed: ${r.status} ${await r.text()}`);
    return;
  }

  if (process.env.RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!r.ok) throw new Error(`Resend failed: ${r.status} ${await r.text()}`);
    return;
  }

  throw new Error('No email provider configured (SENDGRID_API_KEY or RESEND_API_KEY)');
}

export function reminderHtml(opts: {
  name: string; dateISO: string; start: string; end?: string; venue?: string;
}) {
  const { name, dateISO, start, end, venue } = opts;
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
    <h2 style="margin:0 0 8px">Appointment Reminder</h2>
    <p>Hi ${name || 'there'},</p>
    <p>This is a reminder of your Good2Go assessment scheduled for:</p>
    <p><strong>${dateISO}</strong> between <strong>${start}</strong>${end ? `–<strong>${end}</strong>`:''}${venue ? ` at <strong>${venue}</strong>`:''}.</p>
    <p>If you need to reschedule, please reply to this email.</p>
    <p>— Good2Go</p>
  </div>`;
}

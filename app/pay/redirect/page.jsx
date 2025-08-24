  // Server component that renders an auto-posting HTML form to the HPP.
  import React from 'react';
  import { headers } from 'next/headers';

  export const dynamic = 'force-dynamic';

  function replaceTokens(template, ctx) {
    return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const k = String(key || '').trim();
      return Object.prototype.hasOwnProperty.call(ctx, k) ? String(ctx[k]) : '';
    });
  }

  export default function Page({ searchParams }) {
    // Extract runtime values from query
    const bid = searchParams?.bid || '';
    const reference = searchParams?.ref || '';
    const amount = Number.parseInt(searchParams?.amount || '0', 10);

    // Determine absolute return URLs
    const h = headers();
    const origin = h.get('x-forwarded-proto') && h.get('x-forwarded-host')
      ? `${h.get('x-forwarded-proto')}://${h.get('x-forwarded-host')}`
      : '';

    const successUrl = `${origin}/api/worldline/return?status=success&bid=${encodeURIComponent(bid)}&ref=${encodeURIComponent(reference)}`;
    const failUrl    = `${origin}/api/worldline/return?status=fail&bid=${encodeURIComponent(bid)}&ref=${encodeURIComponent(reference)}`;
    const cancelUrl  = `${origin}/api/worldline/return?status=cancel&bid=${encodeURIComponent(bid)}&ref=${encodeURIComponent(reference)}`;

    const ctx = { bid, reference, amount, successUrl, failUrl, cancelUrl };

    // Read envs – endpoint and JSON fields (stringified).
    const endpoint = process.env.WORLDLINE_FORM_ENDPOINT || '';
    let fieldsSpec = {};
    try {
      fieldsSpec = JSON.parse(process.env.WORLDLINE_FORM_FIELDS || '{}');
    } catch {}

    // Create hidden inputs after token replacement.
    const inputs = Object.entries(fieldsSpec).map(([name, value]) => {
      const v = typeof value === 'string' ? replaceTokens(value, ctx) : String(value ?? '');
      return React.createElement('input', { key: name, type: 'hidden', name, value: v });
    });

    const warnings = [];
    if (!endpoint) warnings.push('WORLDLINE_FORM_ENDPOINT is not set.');
    if (Object.keys(fieldsSpec).length === 0) warnings.push('WORLDLINE_FORM_FIELDS is empty – no fields to post.');
    if (!amount) warnings.push('Amount is 0 – check booking flow for amount cents.');

    return (
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Redirecting to payment…</title>
          <meta name="robots" content="noindex" />
        </head>
        <body style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', padding:'2rem'}}>
          <h1>Redirecting to payment…</h1>
          {warnings.length > 0 && (
            <div style={{background:'#fff3cd', border:'1px solid #ffeeba', padding:'1rem', marginBottom:'1rem'}}>
              <b>Config warnings</b>
              <ul>{warnings.map((w,i)=>(<li key={i}>{w}</li>))}</ul>
            </div>
          )}
          <form id="hppForm" method="post" action={endpoint}>
            {inputs}
            {/* Fallback visible fields for quick debugging */}
            <noscript>
              <p>JavaScript is disabled. Click the button below to continue.</p>
              <button type="submit">Continue to Payment</button>
            </noscript>
          </form>
          <script dangerouslySetInnerHTML={{__html:`setTimeout(function(){var f=document.getElementById('hppForm'); if(f){f.submit();}}, 50);`}}/>
          <p>If you are not redirected automatically, <button onClick="document.getElementById('hppForm').submit()">click here</button>.</p>
          <pre style={{background:'#f6f8fa', padding:'12px', borderRadius:'8px', overflow:'auto'}}>
{JSON.stringify({ endpoint, ctx, fields: fieldsSpec }, null, 2)}
          </pre>
        </body>
      </html>
    );
  }

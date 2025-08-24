// app/pay/redirect/page.jsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function wlEndpoint(env) {
  const e = String(env || '').toLowerCase();
  return e === 'uat'
    ? 'https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest'
    : 'https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest';
}

export default async function PayRedirectPage({ searchParams }) {
  const ref = (searchParams?.ref || '').toString();
  const amount = (searchParams?.amount || '').toString(); // cents
  const merchantId = process.env.WORLDLINE_MERCHANT_ID || '';
  const currency = process.env.WORLDLINE_CURRENCY || 'NZD';
  const successUrl = process.env.WORLDLINE_SUCCESS_URL || 'https://good2go-rth.com/success';
  const cancelUrl = process.env.WORLDLINE_CANCEL_URL || 'https://good2go-rth.com/cancel';
  const errorUrl = process.env.WORLDLINE_ERROR_URL || 'https://good2go-rth.com/error';
  const endpoint = wlEndpoint(process.env.WORLDLINE_ENV);

  const problems = [];
  if (!ref) problems.push('Missing ref');
  if (!amount) problems.push('Missing amount');
  if (!merchantId) problems.push('Missing WORLDLINE_MERCHANT_ID');

  if (problems.length) {
    return (
      <html>
        <body style={{ fontFamily: 'system-ui', padding: 20 }}>
          <h2>Payment redirect blocked</h2>
          <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
          <p>Expected URL: <code>/pay/redirect?ref=BOOKING_REF&amp;amount=CENTS</code></p>
        </body>
      </html>
    );
  }

  const fields = {
    merchantId,
    amount,
    currency,
    merchantReference: ref,
    returnUrl: successUrl,
    cancelUrl,
    errorUrl,
  };

  return (
    <html>
      <body>
        <h1>Redirecting to Worldline…</h1>
        <form id="wl-form" method="post" action={endpoint}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.getElementById('wl-form').submit();`,
          }}
        />
        <noscript>
          <p>JavaScript is required to continue to the payment page.</p>
          <button type="submit" form="wl-form">Continue</button>
        </noscript>
      </body>
    </html>
  );
}

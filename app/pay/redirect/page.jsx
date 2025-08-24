// app/pay/redirect/page.jsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server page that receives ?ref=<bookingRef>&amount=<cents>
 * and auto-POSTs a form to Worldline Web Payments WPRequest.
 *
 * Required env:
 *   WORLDLINE_ENV            = uat | prod   (anything else treated as prod)
 *   WORLDLINE_MERCHANT_ID    = your merchant id (e.g. 14617)
 *   WORLDLINE_CURRENCY       = NZD
 *   WORLDLINE_SUCCESS_URL    = https://good2go-rth.com/success
 *   WORLDLINE_CANCEL_URL     = https://good2go-rth.com/cancel
 *   WORLDLINE_ERROR_URL      = https://good2go-rth.com/error
 *
 * NOTE: If your account requires a MAC/HMAC, add that field here once you
 * confirm the exact field name and signing algorithm from Click support.
 */

function wlBase(env) {
  const e = (env || '').toLowerCase();
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
  const endpoint = wlBase(process.env.WORLDLINE_ENV);

  // Very defensive guardrails so we never ship an empty POST
  const problems = [];
  if (!ref) problems.push('Missing ref');
  if (!amount) problems.push('Missing amount');
  if (!merchantId) problems.push('Missing WORLDLINE_MERCHANT_ID');

  if (problems.length) {
    return (
      <html>
        <body style={{ fontFamily: 'system-ui', padding: 20 }}>
          <h2>Payment redirect blocked</h2>
          <p>Fix the following:</p>
          <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          <p>URL expected: <code>/pay/redirect?ref=BOOKING_REF&amp;amount=CENTS</code></p>
        </body>
      </html>
    );
  }

  // Worldline field names (minimal set). These names come from the Click docs you pasted.
  // If your account requires additional fields or a MAC, add inputs below.
  const fields = {
    merchantId,
    // Web Payments expects amount in cents as a plain number
    amount,
    currency,
    // "merchantReference" aligns with Worldline "reference/merchantRef"
    merchantReference: ref,
    returnUrl: successUrl,   // success/return in your console
    cancelUrl,
    errorUrl,
  };

  return (
    <html>
      <body>
        <form id="wl-form" method="post" action={endpoint}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {/* If you later need a MAC/HMAC: */}
          {/* <input type="hidden" name="mac" value={computedMac} /> */}
        </form>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){ document.getElementById('wl-form').submit(); })();
            `,
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

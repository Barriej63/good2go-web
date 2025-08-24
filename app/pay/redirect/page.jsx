'use client';
import React, { useEffect, useRef, useMemo, useState } from 'react';

/**
 * /pay/redirect?ref=<REF>&amount=<CENTS>
 * This page builds a proper HTML <form method="POST"> and auto-submits
 * to Click/WebPayments. If you open this URL manually, you will still POST,
 * so you will *not* see the 405 GET error anymore.
 */
export default function PayRedirectPage({ searchParams }) {
  const formRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Read query
  const ref = searchParams?.ref || '';
  const amount = searchParams?.amount || '';

  // Map field names from env (NEXT_PUBLIC_ so they are embedded at build time)
  const ACTION = process.env.NEXT_PUBLIC_WORLDLINE_POST_URL || 'https://secure.paymarkclick.co.nz/webpayments';
  const MERCHANT_FIELD = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_MERCHANT || 'merchantId';
  const AMOUNT_FIELD   = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_AMOUNT   || 'amount';
  const CURRENCY_FIELD = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_CURRENCY || 'currency';
  const REF_FIELD      = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_REFERENCE|| 'reference';
  const RETURN_FIELD   = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_RETURN   || 'return_url';
  const NOTIFY_FIELD   = process.env.NEXT_PUBLIC_WORLDLINE_FIELD_NOTIFY   || 'notification_url';

  // Values
  const MERCHANT_VALUE = process.env.NEXT_PUBLIC_WORLDLINE_MERCHANT_ID || '';
  const CURRENCY_VALUE = process.env.NEXT_PUBLIC_WORLDLINE_CURRENCY || 'NZD';
  // Return URL points to our server route that marks the booking paid and then redirects to success
  const RETURN_URL     = (process.env.NEXT_PUBLIC_BASE_URL || 'https://good2go-rth.com') + '/api/worldline/return?ref=' + encodeURIComponent(ref);

  // Extra passthrough fields (optional)
  // You can add envs like NEXT_PUBLIC_WORLDLINE_EXTRA_FIELDS='{"testMode":"true"}'
  let extras = {};
  try {
    if (process.env.NEXT_PUBLIC_WORLDLINE_EXTRA_FIELDS) {
      extras = JSON.parse(process.env.NEXT_PUBLIC_WORLDLINE_EXTRA_FIELDS);
    }
  } catch (e) {}

  useEffect(() => {
    // Minimal guardrails
    if (!ref || !amount) return;
    if (!MERCHANT_VALUE) return;
    setReady(true);
  }, [ref, amount, MERCHANT_VALUE]);

  useEffect(() => {
    if (ready && formRef.current) {
      // Auto-submit after one tick
      const t = setTimeout(() => {
        formRef.current.submit();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [ready]);

  // Show a tiny debug for humans while the form posts
  return (
    <div style={{maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial'}}>
      <h1>Redirecting to Payment…</h1>
      {!ref || !amount || !MERCHANT_VALUE ? (
        <div style={{color: '#b91c1c'}}>
          <p>Missing required data.</p>
          <ul>
            <li><b>ref</b> in query: <code>{String(ref)}</code></li>
            <li><b>amount</b> in query (cents): <code>{String(amount)}</code></li>
            <li><b>NEXT_PUBLIC_WORLDLINE_MERCHANT_ID</b>: <code>{String(MERCHANT_VALUE || '(empty)')}</code></li>
          </ul>
          <p>Fix your .env and retry the booking.</p>
        </div>
      ) : (
        <>
          <p>Please wait, sending you to our secure payment partner…</p>
          <form ref={formRef} method="POST" action={ACTION}>
            <input type="hidden" name={MERCHANT_FIELD} value={MERCHANT_VALUE} />
            <input type="hidden" name={AMOUNT_FIELD} value={amount} />
            <input type="hidden" name={CURRENCY_FIELD} value={CURRENCY_VALUE} />
            <input type="hidden" name={REF_FIELD} value={ref} />
            <input type="hidden" name={RETURN_FIELD} value={RETURN_URL} />
            {NOTIFY_FIELD ? <input type="hidden" name={NOTIFY_FIELD} value={RETURN_URL} /> : null}
            {Object.entries(extras).map(([k,v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
            <noscript>
              <button type="submit">Continue to payment</button>
            </noscript>
          </form>
        </>
      )}
      <div style={{marginTop: 24, fontSize: 12, color: '#64748b'}}>build: pay-redirect • 2025-08-25</div>
    </div>
  );
}

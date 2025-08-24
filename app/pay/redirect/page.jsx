 'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Env you set in Vercel:
 *  - NEXT_PUBLIC_WP_ACTION_URL       -> e.g. https://uat.paymarkclick.co.nz/webpayments   (or prod)
 *  - NEXT_PUBLIC_WP_MERCHANT_ID      -> e.g. 14617
 *  - NEXT_PUBLIC_WP_CURRENCY         -> e.g. NZD
 *  - NEXT_PUBLIC_WP_SUCCESS_URL      -> e.g. https://good2go-rth.com/success
 *  - NEXT_PUBLIC_WP_CANCEL_URL       -> e.g. https://good2go-rth.com/cancel
 *  - NEXT_PUBLIC_WP_ERROR_URL        -> e.g. https://good2go-rth.com/error
 *
 * Query params you can pass in when you navigate here:
 *  - ref       (booking reference, required)
 *  - amount    (integer cents, e.g. 6500 = $65.00, required)
 *  - currency  (optional, overrides env)
 *  - merchantId (optional, overrides env)
 *  - success, cancel, error (optional, override env)
 *
 * IMPORTANT: This page performs an HTML POST to WebPayments, so we always avoid 405.
 */

export default function PayRedirect() {
  const sp = useSearchParams();
  const formRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Read from env (public)
  const ACTION_URL   = process.env.NEXT_PUBLIC_WP_ACTION_URL || '';
  const DEF_MID      = process.env.NEXT_PUBLIC_WP_MERCHANT_ID || '';
  const DEF_CURR     = process.env.NEXT_PUBLIC_WP_CURRENCY || 'NZD';
  const DEF_SUCCESS  = process.env.NEXT_PUBLIC_WP_SUCCESS_URL || '';
  const DEF_CANCEL   = process.env.NEXT_PUBLIC_WP_CANCEL_URL || '';
  const DEF_ERROR    = process.env.NEXT_PUBLIC_WP_ERROR_URL || '';

  // Values from query or default
  const payload = useMemo(() => {
    const ref      = sp.get('ref') || '';
    const amount   = sp.get('amount') || '';
    const merchant = sp.get('merchantId') || DEF_MID;
    const currency = sp.get('currency') || DEF_CURR;
    const success  = sp.get('success') || DEF_SUCCESS;
    const cancel   = sp.get('cancel')  || DEF_CANCEL;
    const error    = sp.get('error')   || DEF_ERROR;

    return {
      merchantId: merchant,
      amount,            // integer cents as required by your Click setup (e.g. 6500)
      currency,          // NZD
      reference: ref,    // your booking ref
      return_url: success,   // Click will POST the result to this URL per your console setting
      cancel_url: cancel,
      error_url:  error,
    };
  }, [sp, DEF_MID, DEF_CURR, DEF_SUCCESS, DEF_CANCEL, DEF_ERROR]);

  useEffect(() => {
    // Only auto-submit when we have the minimum fields
    if (!ACTION_URL || !payload.reference || !payload.amount || !payload.merchantId) {
      setReady(false);
      return;
    }
    setReady(true);

    // give the browser a tick to paint, then submit the real POST
    const t = setTimeout(() => {
      formRef.current?.submit();
    }, 300);
    return () => clearTimeout(t);
  }, [ACTION_URL, payload]);

  // Fallback visible form (in case auto-submit is blocked)
  return (
    <div style={{maxWidth: 720, margin: '3rem auto', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica'}}>
      <h1>Redirecting to Payment…</h1>
      {!ACTION_URL && (
        <p style={{color: 'crimson'}}>
          Missing NEXT_PUBLIC_WP_ACTION_URL. Set it to your Click WebPayments URL
          (e.g. <code>https://uat.paymarkclick.co.nz/webpayments</code>).
        </p>
      )}
      {(!payload.reference || !payload.amount || !payload.merchantId) && (
        <p style={{color: 'crimson'}}>
          Missing required values: <code>ref</code>, <code>amount</code>, or <code>merchantId</code>.
          These must be provided via query string or env.
        </p>
      )}

      <form ref={formRef} method="post" action={ACTION_URL} style={{display:'grid', gap:'0.5rem'}}>
        {Object.entries(payload).map(([k, v]) => (
          <div key={k}>
            <input type="hidden" name={k} value={v} />
          </div>
        ))}

        {/* Debug table so you can see exactly what will be posted */}
        <table style={{borderCollapse:'collapse', width:'100%', marginTop:'1rem'}}>
          <thead>
            <tr><th style={th}>Field</th><th style={th}>Value</th></tr>
          </thead>
          <tbody>
            {Object.entries(payload).map(([k, v]) => (
              <tr key={k}>
                <td style={td}><code>{k}</code></td>
                <td style={td}><code>{String(v)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{marginTop:'1rem'}}>
          <button type="submit" style={btn}>Pay Now</button>
          {!ready && <p style={{marginTop:'0.5rem'}}>Fix the red items above, then click <b>Pay Now</b>.</p>}
          {ready && <p>Posting to: <code>{ACTION_URL}</code> …</p>}
        </div>
      </form>
    </div>
  );
}

const th = {textAlign:'left', borderBottom:'1px solid #ddd', padding:'8px', background:'#fafafa'};
const td = {borderBottom:'1px solid #eee', padding:'8px'};
const btn = {padding:'10px 16px', borderRadius:8, border:'1px solid #ccc', background:'#111', color:'#fff'};


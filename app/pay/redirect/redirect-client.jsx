// app/pay/redirect/redirect-client.jsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

/**
 * Reads ?ref= and ?amount= from the URL and POSTs a hidden form
 * to the proper Worldline endpoint. This is the browser side only;
 * if you later prefer a server proxy, replace this with a fetch to
 * /api/worldline/create that returns the HPP URL.
 */
export default function RedirectClient() {
  const sp = useSearchParams();
  const ref = sp.get('ref') || '';
  const amount = sp.get('amount') || '';

  // pick UAT vs PROD from env
  const endpoint = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_WORLDLINE_ENV || '').toLowerCase();
    const isProd = env === 'prod' || env === 'production' || env === 'live';
    return isProd
      ? 'https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest'
      : 'https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest';
  }, []);

  useEffect(() => {
    if (!ref || !amount) return;

    // If your profile expects different field names, update here:
    const ACCOUNT_ID = process.env.NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID || '';
    const USERNAME   = process.env.NEXT_PUBLIC_WORLDLINE_USERNAME || '';
    const PASSWORD   = process.env.NEXT_PUBLIC_WORLDLINE_PASSWORD || '';
    const CURRENCY   = process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || 'NZD';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;

    const add = (name, value) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };

    // Common Worldline fields (adjust to your tenant if names differ)
    add('account_id', ACCOUNT_ID);   // sometimes 'merchantId' or 'accountId'
    add('username', USERNAME);
    add('password', PASSWORD);
    add('amount', amount);           // integer cents
    add('currency', CURRENCY);
    add('reference', ref);

    const origin = window.location.origin;
    add('return_url', `${origin}/api/worldline/return?ref=${encodeURIComponent(ref)}`);
    add('notification_url', `${origin}/api/worldline/return?notify=1`);

    document.body.appendChild(form);
    form.submit();

    return () => {
      try { document.body.removeChild(form); } catch {}
    };
  }, [ref, amount, endpoint]);

  return (
    <main className="p-6 text-lg">
      Redirecting to Worldline… (do not close this window)
    </main>
  );
}

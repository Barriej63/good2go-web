'use client';
import { useEffect, useRef, useState } from 'react';

export default function PayRedirect({ searchParams }) {
  const formRef = useRef(null);
  const [err, setErr] = useState('');
  const ref = (searchParams?.ref || '').toString();
  const amount = parseInt((searchParams?.amount || '').toString(), 10);

  useEffect(() => {
    if (!ref || !amount || Number.isNaN(amount)) {
      setErr('Missing or invalid booking reference / amount.');
      return;
    }
    const env = process.env.NEXT_PUBLIC_WORLDLINE_ENV || 'uat';
    const base = env.toLowerCase() === 'prod' || env.toLowerCase() === 'production'
      ? 'https://secure.paymarkclick.co.nz'
      : 'https://uat.paymarkclick.co.nz';
    const action = base + '/webpayments';

    const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';

    const success = process.env.NEXT_PUBLIC_WORLDLINE_SUCCESS_URL || (origin + '/success');
    const cancel  = process.env.NEXT_PUBLIC_WORLDLINE_CANCEL_URL  || (origin + '/cancel');
    const error   = process.env.NEXT_PUBLIC_WORLDLINE_ERROR_URL   || (origin + '/error');

    const merchantId = process.env.NEXT_PUBLIC_WORLDLINE_MERCHANT_ID || '';
    if (!merchantId) {
      setErr('Missing NEXT_PUBLIC_WORLDLINE_MERCHANT_ID');
      return;
    }
    const f = formRef.current; if (!f) return;
    f.action = action;
    f.elements['merchantId'].value = merchantId;
    f.elements['amount'].value = (amount / 100).toFixed(2);
    f.elements['currency'].value = 'NZD';
    f.elements['merchantReference'].value = ref;
    f.elements['returnUrl'].value = success;
    f.elements['cancelUrl'].value = cancel;
    f.elements['errorUrl'].value = error;
    f.submit();
  }, [ref, amount]);

  if (err) {
    return (<div className="mx-auto max-w-xl p-6"><h1 className="text-2xl font-semibold mb-3">Cannot start payment</h1><p className="text-red-600">{err}</p></div>);
  }
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold mb-2">Redirecting to payment…</h1>
      <form ref={formRef} method="POST" className="hidden">
        <input type="hidden" name="merchantId" />
        <input type="hidden" name="amount" />
        <input type="hidden" name="currency" />
        <input type="hidden" name="merchantReference" />
        <input type="hidden" name="returnUrl" />
        <input type="hidden" name="cancelUrl" />
        <input type="hidden" name="errorUrl" />
      </form>
    </div>
  );
}

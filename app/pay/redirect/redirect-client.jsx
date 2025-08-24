
'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function getEnv(k, def='') {
  if (typeof window === 'undefined') return def;
  return process.env[k] || def;
}

function endpoints(env) {
  const isProd = /^(prod|production|live)$/i.test(env||'');
  const base = isProd
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
  return {
    wpRequest: base + '/api/webpayments/paymentservice/rest/WPRequest',
  };
}

function buildFields({ref, amount}) {
  const env = getEnv('NEXT_PUBLIC_WORLDLINE_ENV','uat');
  const ep  = endpoints(env);
  // Merchant creds
  const accountId = getEnv('NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID','');
  const username  = getEnv('NEXT_PUBLIC_WORLDLINE_USERNAME','');
  const password  = getEnv('NEXT_PUBLIC_WORLDLINE_PASSWORD','');
  const currency  = getEnv('NEXT_PUBLIC_PAYMENT_CURRENCY','NZD');

  // Return endpoints
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const returnUrl = origin + '/api/worldline/return';
  const notifyUrl = origin + '/api/worldline/return?notify=1';

  // Adjust key names here if your tenant expects different field names.
  const fields = {
    account_id: accountId,
    username,
    password,
    amount: String(amount || ''),
    currency,
    return_url: returnUrl,
    notification_url: notifyUrl,
    merchant_reference: ref || '',
  };
  return { action: ep.wpRequest, fields };
}

export default function RedirectClient() {
  const params = useSearchParams();

  useEffect(() => {
    const ref    = params.get('ref') || '';
    const amount = params.get('amount') || '';
    if (!ref || !amount) {
      console.error('pay/redirect missing ref or amount');
      return;
    }

    const { action, fields } = buildFields({ref, amount});

    // 1) Try direct POST via a hidden form
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = action;
      form.style.display = 'none';
      Object.entries(fields).forEach(([k,v]) => {
        const input = document.createElement('input');
        input.name = k;
        input.value = String(v ?? '');
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      console.warn('Direct POST failed, falling back to server create', e);
      // 2) Fallback to server-side create which streams HTML back
      const qs = new URLSearchParams({ ref, amount: String(amount) }).toString();
      window.location.href = '/api/worldline/create?' + qs;
    }
  }, [params]);

  return <div style={{padding:'2rem'}}>Redirecting to payment…</div>;
}

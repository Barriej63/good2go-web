// app/api/worldline/create/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function esc(s: string) {
  return s.replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { ref, amount } = await req.json().catch(() => ({} as any));
    if (!ref || !Number.isFinite(amount)) {
      return NextResponse.json({ ok: false, error: 'missing ref/amount' }, { status: 400 });
    }

    const ENV = (process.env.WORLDLINE_ENV || process.env.NEXT_PUBLIC_WORLDLINE_ENV || 'production').toLowerCase();
    const base =
      ENV === 'uat'
        ? 'https://uat.paymarkclick.co.nz'
        : 'https://secure.paymarkclick.co.nz';

    const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID || '';
    const username  = process.env.WORLDLINE_USERNAME   || process.env.NEXT_PUBLIC_WORLDLINE_USERNAME   || '';
    const password  = process.env.WORLDLINE_PASSWORD   || process.env.NEXT_PUBLIC_WORLDLINE_PASSWORD   || '';
    const merchantId   = process.env.WORLDLINE_MERCHANT_ID   || process.env.NEXT_PUBLIC_WORLDLINE_MERCHANT_ID   || '';
    const merchantName = process.env.WORLDLINE_MERCHANT_NAME || process.env.NEXT_PUBLIC_WORLDLINE_MERCHANT_NAME || 'Good2Go';
    const currency  = process.env.WORLDLINE_CURRENCY || process.env.NEXT_PUBLIC_WORLDLINE_CURRENCY || 'NZD';

    if (!accountId || !username || !password) {
      return NextResponse.json({ ok: false, error: 'Missing Worldline credentials (accountId/username/password)' }, { status: 500 });
    }

    const dollars = Math.round(amount) / 100;

    const host = process.env.NEXT_PUBLIC_SITE_ORIGIN || `https://${req.headers.get('host')}`;
    const successUrl = new URL('/success', host).toString();
    const cancelUrl  = new URL('/cancel',  host).toString();
    const errorUrl   = new URL('/error',   host).toString();

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<WPRequest xmlns="https://secure.paymarkclick.co.nz/api/">
  <Authentication>
    <AccountId>${esc(accountId)}</AccountId>
    <UserName>${esc(username)}</UserName>
    <Password>${esc(password)}</Password>
  </Authentication>
  <Request>
    <Merchant>
      <MerchantId>${esc(merchantId)}</MerchantId>
      <MerchantName>${esc(merchantName)}</MerchantName>
    </Merchant>
    <Transaction>
      <Amount>${dollars.toFixed(2)}</Amount>
      <Currency>${esc(currency)}</Currency>
      <Reference>${esc(ref)}</Reference>
    </Transaction>
    <Urls>
      <SuccessUrl>${esc(successUrl)}</SuccessUrl>
      <CancelUrl>${esc(cancelUrl)}</CancelUrl>
      <ErrorUrl>${esc(errorUrl)}</ErrorUrl>
    </Urls>
  </Request>
</WPRequest>`;

    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
      cache: 'no-store',
    });

    const text = await resp.text();
    const m = text.match(/<\s*redirecturl\s*>([^<]+)<\s*\/\s*redirecturl\s*>/i);
    if (resp.ok && m?.[1]) {
      return NextResponse.json({ ok: true, redirectUrl: (m[1] as string).trim() });
    }
    const em = text.match(/<\s*errormessage\s*>([^<]+)</i);
    const en = text.match(/<\s*errornumber\s*>([^<]+)</i);
    return NextResponse.json({
      ok: false,
      status: resp.status,
      endpoint,
      error: em?.[1]?.trim() || 'WPRequest failed',
      code: en?.[1]?.trim(),
      body: text.slice(0, 1000),
    }, { status: 502 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unhandled' }, { status: 500 });
  }
}

export type WorldlineEnv = 'uat' | 'prod';

export function worldlineBase(env: string | undefined): string {
  const e = (env || 'uat').toLowerCase();
  return e === 'prod'
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
}

// Convert cents to a "d.cc" string (e.g. 6500 -> "65.00")
export function centsToAmountString(cents: number): string {
  const n = Math.max(0, Math.round(cents || 0));
  return (n / 100).toFixed(2);
}

/**
 * Build minimal JSON body for WPRequest (Web Payments) endpoint.
 * This is aligned to Worldline NZ Web Payments REST docs.
 */
export function buildWPRequestBody(opts: {
  username: string;
  password: string;
  accountId: string;
  amountCents: number;
  currency?: string;
  merchantReference: string;
  returnUrl: string;
  notificationUrl?: string;
}) {
  const currency = opts.currency || 'NZD';
  return {
    username: opts.username,
    password: opts.password,
    accountId: opts.accountId,
    amount: centsToAmountString(opts.amountCents),
    currency,
    merchantReference: opts.merchantReference,
    returnUrl: opts.returnUrl,
    notificationUrl: opts.notificationUrl || opts.returnUrl
  };
}

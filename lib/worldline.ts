export type WorldlineMode = 'uat' | 'prod' | 'production';

export function wpBase(mode: string | undefined): string {
  const m = (mode || 'uat').toLowerCase();
  return (m === 'prod' || m === 'production')
    ? 'https://secure.paymarkclick.co.nz'
    : 'https://uat.paymarkclick.co.nz';
}

export function wpRequestUrl(mode: string | undefined): string {
  return wpBase(mode) + '/api/webpayments/paymentservice/rest/WPRequest';
}

// Returns a form-encoded string.
export function buildWPRequestBody(opts: {
  username: string;
  password: string;
  accountId: string;
  amountCents: number; // in cents
  type?: 'purchase' | 'authorisation' | 'statuscheck' | 'tokenise';
  reference?: string;
  particular?: string;
  returnUrl: string;
  transactionSource?: 'INTERNET' | 'MOTO';
}) {
  const amount = (Math.max(0, Math.round(opts.amountCents)) / 100).toFixed(2);
  const params = new URLSearchParams();
  params.set('username', opts.username);
  params.set('password', opts.password);
  params.set('account_id', opts.accountId);
  params.set('cmd', '_xclick');
  params.set('type', opts.type || 'purchase');
  params.set('amount', amount);
  if (opts.reference) params.set('reference', String(opts.reference).slice(0,50));
  if (opts.particular) params.set('particular', String(opts.particular).slice(0,50));
  params.set('return_url', opts.returnUrl);
  params.set('transaction_source', opts.transactionSource || 'INTERNET');
  return params.toString();
}

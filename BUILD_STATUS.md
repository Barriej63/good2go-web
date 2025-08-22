# Good2Go Build Status — Web Payments (WPRequest)

## Env
- WORLDLINE_ENV: uat | production | prod | live
- WORLDLINE_USERNAME: <Client ID>
- WORLDLINE_PASSWORD: <API Key>
- WORLDLINE_ACCOUNT_ID: <Account ID>
- PUBLIC_RETURN_URL: https://your-domain/success (fallback if not supplied by client)
- PUBLIC_CANCEL_URL: https://your-domain/cancel (optional)

## HPP (Hosted Payment Page) creation
- Endpoint: `https://secure[.uat].paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest`
- Method: POST `application/x-www-form-urlencoded`
- Required fields we send:
  - `cmd=_xclick`
  - `type=purchase`
  - `amount=##.##`
  - `reference`, `particular` (trimmed to 50 chars)
  - `username`, `password`, `account_id`
  - `return_url` (set `PUBLIC_RETURN_URL` if not supplied)

## Routes
- `/api/worldline/test` → $1.00 probe; returns `{ ok, status, redirectUrl, endpoint, envMode, urls, raw }`
- `/api/worldline/create` → real create; body: `{ amountCents, bookingId?, reference?, particular?, returnUrl?, cancelUrl?, customerEmail?, storePaymentToken? }`

## Next
1) Set env for **one** environment (uat or production) and deploy.
2) Visit `/api/worldline/test` and click `redirectUrl` → expect HPP.
3) Run `/book` → Proceed to Payment → HPP.

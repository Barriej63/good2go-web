# Good2Go Build Status — Click™ (Paymark) Compatibility

## Env (set one environment at a time)
- WORLDLINE_ENV: production | prod | live | uat
- WORLDLINE_USERNAME: <Client ID>
- WORLDLINE_PASSWORD: <API Key>
- WORLDLINE_ACCOUNT_ID: <Account ID>
- PUBLIC_RETURN_URL: https://your-domain/success (optional fallback)
- PUBLIC_CANCEL_URL: https://your-domain/cancel (optional fallback)

## Routes
- /api/worldline/test  → Probes prod + UAT across webpayments + transactions paths; returns first valid HPP URL
- /api/worldline/create → Uses env host and same path list; returns { ok, redirectUrl, endpoint }

## Notes
- The plugin you use (YHP Worldline Subscription Click) often targets /api/webpayments. This pack tries that first.
- We trim `particular` to 50 chars to avoid PARAMETER 5023 (“maximum length of 50”).

## Next
1) Set env for **one** environment (production or uat), deploy.
2) Open /api/worldline/test → click `redirectUrl` (should land on HPP).
3) Run /book → Proceed to Payment.

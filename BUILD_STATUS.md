# Good2Go Build Status — Reset Pack

## Env (choose ONE environment and keep all 3 creds from that environment)
- WORLDLINE_ENV: production | prod | live  (for prod)  OR  uat (for test)
- WORLDLINE_USERNAME: <Client ID for the chosen environment>
- WORLDLINE_PASSWORD: <API Key for the chosen environment>
- WORLDLINE_ACCOUNT_ID: <Account ID for the chosen environment>

## Routes
- /api/worldline/test  → POSTs to {host}/api/transactions and returns redirectUrl if successful
- /api/worldline/create → used by booking flow

## Notes
- Endpoint is locked to `/api/transactions` (plural), which is the standard for HPP create.
- If you keep seeing 404/405 in production after this reset, Worldline may not have enabled HPP Create for your merchant in prod. Ask them to confirm the Hosted Payments API endpoint `/api/transactions` is enabled for your Account ID.

# Good2Go Build Status (Worldline)

## Env (Vercel – Production)
- WORLDLINE_ENV: uat | production | prod | live
- WORLDLINE_USERNAME: <Client ID>
- WORLDLINE_PASSWORD: <API Key>
- WORLDLINE_ACCOUNT_ID: <Account ID>
- WORLDLINE_TEST_ENABLED: false (set "true" temporarily to enable /api/worldline/test)
- FIREBASE_SERVICE_ACCOUNT: set ✅
- SENDGRID_API_KEY: set? ☐
- SENDGRID_FROM: "Good2Go <help@good2go-rth.com>"

## Endpoints
- Primary:   {host}/api/transactions
- Fallback:  {host}/api/transaction
  (The code auto-tries both and reports which one succeeded.)

## Routes
- /book (booking UI with Date)
- /api/worldline/create
- /api/worldline/return
- /api/worldline/test (guarded)
- /api/public/products
- /api/public/timeslots?region=REGION
- /api/health

## Notes
- If you see XHTML 404 with w3.org links in `urls`, that's an IIS 404 HTML page — the code now detects this and falls back to the alternate endpoint.
- After verification, disable the test route.

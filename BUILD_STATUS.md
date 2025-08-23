
# Good2Go Build Status

## Env (Vercel – Production)
- FIREBASE_SERVICE_ACCOUNT: set ✅
- WORLDLINE_ENV: `uat` or `production`
- WORLDLINE_USERNAME: <Client ID>
- WORLDLINE_PASSWORD: <API Key>
- WORLDLINE_ACCOUNT_ID: <Account ID>
- SENDGRID_API_KEY: optional (for confirmation emails)
- SENDGRID_FROM: e.g. `"Good2Go <help@good2go-rth.com>"`

## Routes
- `/api/worldline/create` → creates booking, calls WPRequest, returns Hosted Payment Page URL
- `/api/worldline/return` → handles Worldline return POST/GET, marks booking paid, returns HTML success
- `/success` → React UI success page (shows booking reference)

## Firestore
- `products/{id}` → `{ name, priceCents, active: true }`
- `bookings/{id}` → `{ ...fields, status, paid, worldline: { create, return } }`

## Notes
- `create` forces `return_url` to `/api/worldline/return?bid=<id>` to avoid 405 errors.
- `return` always responds with HTML success (200) to any POST/GET from Worldline.
- Users will reliably see "Booking Successful" with their reference code.

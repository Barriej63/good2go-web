# Good2Go — WPRequest fix + Success page

**Create route**
- Removes `cancel_url` (fixes PARAMETER 8001 “whitelisting” error).
- Accepts `{ productId }` if `amountCents` not supplied and loads `products/<productId>.priceCents`.
- Auto-creates pending `bookings/<id>` if `bookingId` missing.
- Ensures `return_url` includes `?bid=<bookingId>` (or replaces `{bookingId}` token).
- Sends only commonly whitelisted fields to WPRequest.

**Success page**
- New `/success` route shows `bid` from the query string.

**Env**
- `WORLDLINE_ENV` = `production|prod|live` or `uat`
- `WORLDLINE_USERNAME`, `WORLDLINE_PASSWORD`, `WORLDLINE_ACCOUNT_ID`
- Optional: `PUBLIC_RETURN_URL` (default fallback to `/success`)

**Test**
1) From UI, proceed to payment.
2) Complete HPP. You should be redirected to `/success?bid=<id>` and the Firestore booking should flip to `paid:true` via `/api/worldline/return`.

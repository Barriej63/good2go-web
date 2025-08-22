# Good2Go — Worldline WPRequest pack (drop-in)

## What this does
- **Create**: Calls Click™ (Paymark) **WPRequest** to generate a Hosted Payment Page URL.
- **Return**: Marks `bookings/<id>` as paid in Firestore and optionally sends a confirmation email (SendGrid).

## Env (set for ONE environment)
- `WORLDLINE_ENV`: `production` | `prod` | `live` | `uat`
- `WORLDLINE_USERNAME`: Client ID
- `WORLDLINE_PASSWORD`: API Key
- `WORLDLINE_ACCOUNT_ID`: Account ID
- `PUBLIC_RETURN_URL`: `https://your-domain/success` (optional fallback)
- `PUBLIC_CANCEL_URL`: `https://your-domain/cancel` (optional fallback)
- (Optional email) `SENDGRID_API_KEY`, `SENDGRID_FROM` (e.g., `Good2Go <help@good2go-rth.com>`)

## Routes
- `POST /api/worldline/create` → body includes `{ amountCents, bookingId, name, email, region, date, slot, returnUrl?, cancelUrl? }`
  - returns `{ ok, redirectUrl }`
- `GET /api/worldline/return?q=<token>&bid=<bookingId>` → updates Firestore and redirects to `/success?bid=<id>`
  - also supports `POST` with `{ bookingId, q, email?, name? }`

## Firestore write
```
bookings/<bookingId> = {
  ...existing,
  paid: true,
  status: "paid",
  paidAt: <ISO>,
  worldline: { q, env, returnedAt: <ISO> }
}
```

## Notes
- `reference` & `particular` are both set to `BID:<bookingId>` and trimmed to 50 chars.
- If you don't pass `returnUrl`, the route uses `PUBLIC_RETURN_URL` (same for `cancelUrl`).

## Smoke test
1) `POST /api/worldline/create` with a small `amountCents` and your bookingId → copy `redirectUrl` and open it (HPP).
2) Complete payment → you’ll be redirected back to `/success?bid=<id>` and the Firestore doc will show `paid:true`.

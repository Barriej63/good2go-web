# Good2Go — Robust Success Bundle

**Goal:** eliminate 405s entirely and add diagnostics.

What this does
- `/api/worldline/create` (WPRequest):
  - Accepts `{ productId }` or `{ amountCents }`
  - Auto-creates a `bookings/<id>` if needed
  - **Forces** the return URL to `/api/worldline/return?bid=<id>`
  - Stores diagnostics: `worldline.create.endpoint/envMode/redirectUrl`
- `/api/worldline/return`:
  - Accepts JSON, form, or query
  - Marks booking paid
  - Stores diagnostics: request method, headers, first 4k of body
  - **Returns HTML success (200)** so there is NO redirect and NO 405
  - (Optional) small client hop to `/success?bid=<id>` as a GET after rendering

How to use
1) Drop these files in your repo (overwriting existing routes)
2) Deploy once on Vercel
3) Ensure env set for ONE environment:
   - WORLDLINE_ENV=production|uat
   - WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID
4) Test a payment:
   - You should immediately see a success page even if the gateway POSTs
   - Booking is marked `paid:true`
   - Diagnostics written under `bookings/<id>.worldline`

Later, if you prefer redirecting to the React success page only, we can switch back once confirmed stable.
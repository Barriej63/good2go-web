
Good2Go — Worldline Payments Bundle (0825)
==========================================

This bundle adds:
- Client redirect page (/pay/redirect) with Suspense wrapper.
- Server-side Worldline “create” endpoint at /api/worldline/create
  (posts to WPRequest and streams back the HTML so the browser continues).
- Worldline return endpoint at /api/worldline/return (accepts GET/POST and
  routes to /success or /error with the booking ref).
- Client page auto-fallback: if direct POST fails, it calls
  /api/worldline/create?ref=...&amount=...

REQUIRED PUBLIC ENVS (configure in hosting dashboard):
  NEXT_PUBLIC_WORLDLINE_ENV            uat | prod
  NEXT_PUBLIC_WORLDLINE_ACCOUNT_ID     <your account id>
  NEXT_PUBLIC_WORLDLINE_USERNAME       <your username>
  NEXT_PUBLIC_WORLDLINE_PASSWORD       <your password>
  NEXT_PUBLIC_PAYMENT_CURRENCY         NZD   (default used if missing)

OPTIONAL SERVER ENVS (if you prefer not to expose public ones):
  WORLDLINE_ENV, WORLDLINE_ACCOUNT_ID, WORLDLINE_USERNAME, WORLDLINE_PASSWORD

Booking page (client):
  After /api/book returns { ok:true, bookingRef }, redirect to:
    /pay/redirect?ref=<BOOKING_REF>&amount=<CENTS>

Notes:
  - We use the official WPRequest REST endpoint you pasted:
    UAT:  https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest
    PROD: https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest
  - Fields names are the commonly used ones; if your tenant expects slightly
    different keys, edit the `buildFields()` function in redirect-client.jsx
    and api/worldline/create/route.js (they’re in one place for each side).

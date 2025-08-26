Good2Go Worldline Create Shim
Generated: 2025-08-26T00:18:25.917762Z

Adds:
- app/api/worldline/create-shim/route.ts

Purpose:
- Ensures MerchantReference is always set to the bookingId you pass in.
- Forwards the request to your existing creator endpoint, preserving your current integration.
- No changes to downstream code; it returns the same JSON/response your current /api/worldline/create returns.

How to use:
- Frontend: call /api/worldline/create-shim instead of /api/worldline/create (same payload you already send, but include "bookingId").
- The shim sets MerchantReference = bookingId (and Reference if missing), then forwards to WORLDLINE_CREATE_URL or /api/worldline/create.

Optional env:
- WORLDLINE_CREATE_URL = full URL to your existing creator (defaults to your app's /api/worldline/create).

Browser test (GET):
  /api/worldline/create-shim?bookingId=BOOKING_DOC_ID&amount=65.00

Notes:
- Supports application/json and application/x-www-form-urlencoded bodies.

# Good2Go — Worldline Diagnostics Pack

This bundle:
- Uses WPRequest to create the Hosted Payment Page and **stores the chosen redirect URL** on the booking.
- Handles the Worldline return by **serving a success HTML page directly** (no redirect -> no 405), while
  **saving a trimmed copy of the gateway POST payload** for audit under the booking document.

## Files
- app/api/worldline/create/route.ts
- app/api/worldline/return/route.ts

## Firestore writes
- bookings/<id>.worldline.create = { at, endpoint, envMode, redirectUrl }
- bookings/<id>.worldline.return = { at, method, contentType, raw (first 4k), headers }
- bookings/<id> { paid:true, status:"paid", paidAt }

## Env
- WORLDLINE_ENV = production | prod | live | uat
- WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID
- PUBLIC_RETURN_URL (optional; defaults to /api/worldline/return)
- Optional email: SENDGRID_API_KEY, SENDGRID_FROM

## Why keep diagnostics?
- **Support/Audit**: When something goes odd at the gateway, the exact endpoint, redirect URL and the POST back are stored per booking.
- **Regression proofing**: You can quickly compare responses if behaviour changes without digging through logs.
- **Chargeback evidence**: A minimal record of the return payload helps correlate gateway actions to your booking.

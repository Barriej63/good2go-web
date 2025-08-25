# Diagnostics + Robust Return Overlay
Generated: 2025-08-25T09:05:10.185984Z

This overlay helps debug why Firestore/email didn't run, without touching the booking/payment flow.

## What's included
- `app/api/worldline/return/route.ts` — uses a **safe Firestore initializer** and SendGrid HTTPS API; supports `?debug=1` to return JSON instead of redirect.
- `lib/firebaseAdminFallback.ts` — tries your `lib/firebaseAdmin`, else initializes `firebase-admin` from env vars.
- `app/api/debug/firestore/route.ts` — quick connectivity test to Firestore.
- `app/api/debug/email/route.ts` — SendGrid test endpoint.

## Env required for Firestore (service account)
Set these on Vercel if not already present:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`  (remember to replace literal `\n` with actual newlines or escape them as `\n`)

## Env required for email (you already have)
- `SENDGRID_API_KEY`
- `SENDGRID_FROM`   e.g. `Good2Go <help@good2go-rth.com>`
- Optional: `BOOKING_NOTIFY_TO` (fallback recipient)

## How to use diagnostics
1. Deploy this overlay.
2. Visit `/api/debug/firestore` — expect `{ ok:true, wrote:true, id: "..." }`.
3. Visit `/api/debug/email?to=<your email>` — expect `{ ok:true, status:202 }`.
4. After a real HPP success, try `/api/worldline/return?...&debug=1` once (paste the exact query) to see JSON with `persisted` and `emailed` flags.

This does **not** change booking UI or payment creation.

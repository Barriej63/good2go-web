# Good2Go Build Status

## Env (Vercel – Production)
- FIREBASE_SERVICE_ACCOUNT: set ✅
- WORLDLINE_ENV: uat | production | prod | live
- WORLDLINE_USERNAME: <Client ID>
- WORLDLINE_PASSWORD: <API Key>
- WORLDLINE_ACCOUNT_ID: <Account ID>
- WORLDLINE_TEST_ENABLED: false (set "true" temporarily to enable /api/worldline/test)
- SENDGRID_API_KEY: set? ☐
- SENDGRID_FROM: "Good2Go <help@good2go-rth.com>"

## Routes
- /book (booking UI with Date)
- /api/public/products
- /api/public/timeslots?region=REGION
- /api/worldline/create
- /api/worldline/return
- /api/worldline/test (guarded; requires WORLDLINE_TEST_ENABLED=true)
- /api/health (temp)

## Firestore
- products/{baseline-65, post-199} → { name, priceCents, active:true }
- config/timeslots_Auckland → { slots: [{ weekday:"tuesday", start:"17:30", end:"18:30", venueAddress:"TBC" }] }
- bookings/* (created by /api/worldline/create)

## Middleware allowlist
- /api/public, /api/worldline, /book, /success, /cancel, /_next, /favicon.ico

## Next
- Verify /book → Proceed to Payment → HPP
- Confirm /api/worldline/return marks booking paid and sends email if SendGrid is configured.
- Disable test: WORLDLINE_TEST_ENABLED=false.

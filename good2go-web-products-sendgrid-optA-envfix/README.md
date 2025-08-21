# Good2Go Web (Products + Paymark HPP + SendGrid) — OptA + Env Fix

This build:
- Avoids composite index for products (client-side filter/sort).
- Accepts `PAYMARK_ENV=production` as **prod** (and `uat`, `test`, etc. → UAT).

Accepted values (case-insensitive):
- **prod**: `prod`, `production`, `live`
- **uat**: `uat`, `test`, `testing`, `sandbox`, `staging`, `dev`, `development`

Other env vars:
- Public Firebase: `NEXT_PUBLIC_FIREBASE_*`
- Admin Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Paymark/Worldline: `PAYMARK_CLIENT_ID`, `PAYMARK_API_KEY`, `PAYMARK_ACCOUNT_ID`, `PAYMARK_ENV`
- Return URL: `WORLDLINE_RETURN_URL=https://YOUR_DOMAIN/api/worldline/return` (optional; auto-infers from request origin if unset)
- Email (SendGrid): `SENDGRID_API_KEY`, `SENDGRID_FROM="Good2Go <help@good2go-rth.com>"`
